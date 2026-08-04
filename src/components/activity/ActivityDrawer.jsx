import { JarianDrawer } from '../ui';
import './activity.css';

/**
 * درایر عمومی سوابق فعالیت — همیشه از چپ فیزیکی با موشن استاندارد جریان.
 */
export default function ActivityDrawer({
  open,
  onClose,
  title = 'سوابق فعالیت‌ها',
  subtitle = '',
  children,
}) {
  return (
    <JarianDrawer
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="sm"
      className="activity-drawer activity-drawer--shell"
    >
      {children}
    </JarianDrawer>
  );
}
