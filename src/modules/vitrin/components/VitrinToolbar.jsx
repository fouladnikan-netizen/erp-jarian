import VitrinFiltersPopover from './VitrinFiltersPopover';
import ListFilterBar from '../../../components/module/ListFilterBar';

/**
 * Vitrin inline filter control for Block 2 (category chips live in belowSearch).
 */
export default function VitrinToolbar({
  groups,
  filterGroupId,
  onFilterGroupChange,
  activeGroupId,
  subgroupId,
  onSubgroupChange,
}) {
  return (
    <ListFilterBar className="vitrin-toolbar" ariaLabel="فیلتر پیشرفته کاتالوگ">
      <VitrinFiltersPopover
        groups={groups}
        filterGroupId={filterGroupId}
        onFilterGroupChange={onFilterGroupChange}
        activeGroupId={activeGroupId}
        subgroupId={subgroupId}
        onSubgroupChange={onSubgroupChange}
      />
    </ListFilterBar>
  );
}
