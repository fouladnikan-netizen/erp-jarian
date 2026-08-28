import VitrinFiltersPopover from './VitrinFiltersPopover';
import ListFilterBar from '../../../components/module/ListFilterBar';

/**
 * Vitrin inline filter control for Block 2 (category chips live in belowSearch).
 */
export default function VitrinToolbar(props) {
  return (
    <ListFilterBar className="vitrin-toolbar" ariaLabel="فیلتر پیشرفته کاتالوگ">
      <VitrinFiltersPopover {...props} />
    </ListFilterBar>
  );
}
