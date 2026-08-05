import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ListPageLayout from '../../components/module/ListPageLayout';
import ListToolbar from '../../components/module/ListToolbar';
import {
  createAndActivateCampaign,
  toggleCampaignStatus,
  useCampaignKpis,
  useCampaignList,
} from './services/campaignFacade';
import CampaignBuilderDrawer from './CampaignBuilderDrawer';
import MowjKpis from './components/MowjKpis';
import MowjCampaignTable from './components/MowjCampaignTable';
import './mowj.css';

/**
 * موج — فهرست کمپین.
 * چیدمان استاندارد ۳ بلوکی (Law #004): KPI ← تولبار یکپارچه ← جدول.
 * داشبوردهای اجرایی متعلق به آینه است — نه موج.
 */
export default function MowjPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [builderOpen, setBuilderOpen] = useState(false);
  const filters = useMemo(() => ({ query }), [query]);
  const campaigns = useCampaignList(filters);
  const kpis = useCampaignKpis();

  const handleActivate = (draft) => {
    createAndActivateCampaign(draft);
    setBuilderOpen(false);
  };

  return (
    <ListPageLayout
      moduleId="mowj"
      className="mowj-page"
      kpis={<MowjKpis kpis={kpis} />}
      toolbar={(
        <ListToolbar
          className="mowj-list-toolbar"
          searchPlaceholder="جستجو در کمپین‌های موج…"
          searchValue={query}
          onSearchChange={setQuery}
          searchAriaLabel="جستجو در کمپین‌ها"
          primaryLabel="ایجاد کمپین جدید"
          onPrimaryClick={() => setBuilderOpen(true)}
        />
      )}
    >
      <MowjCampaignTable
        campaigns={campaigns}
        listTitle="کمپین‌ها"
        onOpenDetail={(campaign) => {
          navigate(`/mowj/campaign/${encodeURIComponent(campaign.id)}`);
        }}
        onToggleStatus={(campaign) => toggleCampaignStatus(campaign.id)}
      />

      <CampaignBuilderDrawer
        open={builderOpen}
        onClose={() => setBuilderOpen(false)}
        onActivate={handleActivate}
      />
    </ListPageLayout>
  );
}
