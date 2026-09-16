import { apiClient } from '../client';
import { useMockApi } from '../useMockApi';

/**
 * Personal Lead Pipeline — only FE path for pipeline stage mutations (SERVER_FIRST).
 */
export const LeadPipelineRepository = {
  async getMine() {
    if (useMockApi()) {
      return {
        pipeline: { id: 'mock_pipe', name: 'پایپ‌لاین شخصی' },
        stages: [
          { id: 'ms1', name: 'سرنخ جدید', position: 0 },
          { id: 'ms2', name: 'تماس اولیه', position: 1 },
          { id: 'ms3', name: 'پیگیری', position: 2 },
          { id: 'ms4', name: 'ارزیابی', position: 3 },
          { id: 'ms5', name: 'واجد شرایط', position: 4 },
        ],
        created: false,
      };
    }
    const { data } = await apiClient.get('/lead-pipelines/me');
    return data;
  },

  async createStage(name) {
    if (useMockApi()) return this.getMine();
    const { data } = await apiClient.post('/lead-pipelines/me/stages', { name });
    return data;
  },

  async renameStage(stageId, name) {
    if (useMockApi()) return this.getMine();
    const { data } = await apiClient.patch(
      `/lead-pipelines/me/stages/${encodeURIComponent(stageId)}`,
      { name },
    );
    return data;
  },

  async reorderStages(stageIds) {
    if (useMockApi()) return this.getMine();
    const { data } = await apiClient.put('/lead-pipelines/me/stages/reorder', { stageIds });
    return data;
  },

  async deleteStage(stageId, moveToStageId = null) {
    if (useMockApi()) return this.getMine();
    const { data } = await apiClient.delete(
      `/lead-pipelines/me/stages/${encodeURIComponent(stageId)}`,
      { data: moveToStageId ? { moveToStageId } : {} },
    );
    return data;
  },

  async moveLeadToStage(leadId, stageId) {
    if (useMockApi()) return { lead: null };
    const { data } = await apiClient.patch(
      `/leads/${encodeURIComponent(leadId)}/pipeline-stage`,
      { stageId },
    );
    return data;
  },
};

export default LeadPipelineRepository;
