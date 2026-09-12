/**
 * Users store SERVER_FIRST behaviour with mocked UserRepository.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../../api/useMockApi.js', () => ({
  useMockApi: () => false,
  default: () => false,
}));

vi.mock('../../../../api/repositories/UserRepository.js', () => ({
  UserRepository: {
    listUsers: vi.fn(),
    getUser: vi.fn(),
    listRoles: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    resetPassword: vi.fn(),
    resendInvitation: vi.fn(),
  },
}));

const { useUsersStore } = await import('../store/usersStore.js');
const { UserRepository } = await import('../../../../api/repositories/UserRepository.js');

function apiError(status, code, message) {
  const err = new Error(message);
  err.response = { status, data: { error: code, message } };
  return err;
}

const sampleUser = {
  id: 'u_1',
  username: 'sara',
  displayName: 'سارا',
  isActive: true,
  roles: [{ code: 'sales', labelFa: 'کارشناس فروش' }],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

describe('useUsersStore API mode', () => {
  beforeEach(() => {
    useUsersStore.setState({
      users: [],
      roles: [],
      loading: false,
      saving: false,
      error: null,
      errorCode: null,
      loaded: false,
      modalOpen: false,
      editingUserId: null,
      form: {
        fullName: '',
        mobile: '',
        email: '',
        unitId: '',
        positionId: '',
        roleCodes: [],
        status: 'INVITED',
      },
      passwordModalUserId: null,
      passwordForm: { password: '' },
    });
    vi.clearAllMocks();
  });

  it('starts with no mock users', () => {
    expect(useUsersStore.getState().users).toEqual([]);
    expect(useUsersStore.getState()).not.toHaveProperty('MOCK_USERS');
  });

  it('loads real user list from API', async () => {
    UserRepository.listUsers.mockResolvedValue([sampleUser]);
    const users = await useUsersStore.getState().loadUsers();
    expect(users).toHaveLength(1);
    expect(users[0].username).toBe('sara');
    expect(users[0].roles[0].labelFa).toBe('کارشناس فروش');
    expect(useUsersStore.getState().users[0].isActive).toBe(true);
    expect(useUsersStore.getState().loading).toBe(false);
    expect(useUsersStore.getState().error).toBeNull();
  });

  it('does not fall back to mock data when list fails', async () => {
    UserRepository.listUsers.mockRejectedValue(apiError(500, 'INTERNAL_ERROR', 'down'));
    await expect(useUsersStore.getState().loadUsers()).rejects.toThrow();
    expect(useUsersStore.getState().users).toEqual([]);
    expect(useUsersStore.getState().error).toBeTruthy();
  });

  it('create request goes through API and caches response', async () => {
    UserRepository.createUser.mockResolvedValue({
      ...sampleUser,
      id: 'u_new',
      fullName: 'نیما',
      displayName: 'نیما',
      mobile: '09121234567',
    });
    useUsersStore.setState({
      form: {
        fullName: 'نیما',
        mobile: '09121234567',
        email: '',
        unitId: '',
        positionId: '',
        roleCodes: ['sales'],
        status: 'INVITED',
      },
    });
    const result = await useUsersStore.getState().saveUser();
    expect(result.ok).toBe(true);
    expect(UserRepository.createUser).toHaveBeenCalledWith({
      fullName: 'نیما',
      mobile: '09121234567',
      email: '',
      roles: ['sales'],
      organization: undefined,
    });
    expect(useUsersStore.getState().users[0].id).toBe('u_new');
    expect(useUsersStore.getState().modalOpen).toBe(false);
  });

  it('failed create does not fake a local user', async () => {
    UserRepository.createUser.mockRejectedValue(apiError(409, 'MOBILE_EXISTS', 'تکراری'));
    useUsersStore.setState({
      modalOpen: true,
      form: {
        fullName: 'نیما',
        mobile: '09121234567',
        email: '',
        unitId: '',
        positionId: '',
        roleCodes: ['sales'],
        status: 'INVITED',
      },
    });
    const result = await useUsersStore.getState().saveUser();
    expect(result.ok).toBe(false);
    expect(useUsersStore.getState().users).toEqual([]);
    expect(useUsersStore.getState().error).toBe('تکراری');
    expect(useUsersStore.getState().modalOpen).toBe(true);
  });

  it('edit request patches fullName/roles/status', async () => {
    useUsersStore.setState({
      users: [sampleUser],
      editingUserId: 'u_1',
      form: {
        fullName: 'سارا نوری',
        mobile: '09120000000',
        email: '',
        unitId: '',
        positionId: '',
        roleCodes: ['sales', 'purchase'],
        status: 'ACTIVE',
      },
    });
    UserRepository.updateUser.mockResolvedValue({
      ...sampleUser,
      fullName: 'سارا نوری',
      displayName: 'سارا نوری',
      roles: [
        { code: 'purchase', labelFa: 'تدارکات' },
        { code: 'sales', labelFa: 'کارشناس فروش' },
      ],
    });
    const result = await useUsersStore.getState().saveUser();
    expect(result.ok).toBe(true);
    expect(UserRepository.updateUser).toHaveBeenCalledWith('u_1', {
      fullName: 'سارا نوری',
      mobile: '09120000000',
      email: '',
      roles: ['sales', 'purchase'],
      status: 'ACTIVE',
      organization: null,
    });
    expect(useUsersStore.getState().users[0].displayName).toBe('سارا نوری');
  });

  it('status request calls updateUser and does not toggle locally on failure', async () => {
    useUsersStore.setState({ users: [sampleUser] });
    UserRepository.updateUser.mockRejectedValue(
      apiError(409, 'LAST_ACTIVE_ADMIN_REQUIRED', 'سامانه باید حداقل یک کاربر فعال با نقش مدیر داشته باشد.'),
    );
    const result = await useUsersStore.getState().toggleUserStatus('u_1');
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('LAST_ACTIVE_ADMIN_REQUIRED');
    expect(useUsersStore.getState().users[0].isActive).toBe(true);
    expect(useUsersStore.getState().errorCode).toBe('LAST_ACTIVE_ADMIN_REQUIRED');
    expect(useUsersStore.getState().error).toContain('مدیر');
  });

  it('status success updates from server response', async () => {
    useUsersStore.setState({ users: [sampleUser] });
    UserRepository.updateUser.mockResolvedValue({ ...sampleUser, isActive: false });
    const result = await useUsersStore.getState().toggleUserStatus('u_1');
    expect(result.ok).toBe(true);
    expect(UserRepository.updateUser).toHaveBeenCalledWith('u_1', { isActive: false });
    expect(useUsersStore.getState().users[0].isActive).toBe(false);
  });

  it('password reset request goes through API', async () => {
    useUsersStore.setState({
      passwordModalUserId: 'u_1',
      passwordForm: { password: 'ResetPass8!' },
    });
    UserRepository.resetPassword.mockResolvedValue({ ok: true });
    const result = await useUsersStore.getState().resetPassword();
    expect(result.ok).toBe(true);
    expect(UserRepository.resetPassword).toHaveBeenCalledWith('u_1', 'ResetPass8!');
    expect(useUsersStore.getState().passwordModalUserId).toBeNull();
  });

  it('failed password reset keeps modal open and shows error', async () => {
    useUsersStore.setState({
      passwordModalUserId: 'u_1',
      passwordForm: { password: 'ResetPass8!' },
    });
    UserRepository.resetPassword.mockRejectedValue(apiError(404, 'USER_NOT_FOUND', 'کاربر یافت نشد.'));
    const result = await useUsersStore.getState().resetPassword();
    expect(result.ok).toBe(false);
    expect(useUsersStore.getState().passwordModalUserId).toBe('u_1');
    expect(useUsersStore.getState().error).toBe('کاربر یافت نشد.');
  });

  it('resends invitation through API', async () => {
    UserRepository.resendInvitation.mockResolvedValue({
      ok: true,
      invitation: { sent: true },
    });
    const result = await useUsersStore.getState().resendInvitation('u_1');
    expect(result.ok).toBe(true);
    expect(UserRepository.resendInvitation).toHaveBeenCalledWith('u_1');
  });
});
