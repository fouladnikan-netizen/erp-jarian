import { Link } from 'react-router-dom';
import { Network, Shield } from 'lucide-react';
import './organization/organization.css';

/**
 * Security settings hub — entry to organization designer and future RBAC tools.
 */
export default function SecuritySettingsPage() {
  return (
    <div className="shirazeh-section shirazeh-security-hub" dir="rtl">
      <header className="shirazeh-section__header">
        <h2 className="shirazeh-section__title font-meem">امنیت</h2>
        <p className="shirazeh-section__desc font-meem">
          نشست‌ها، سیاست رمز عبور، ساختار سازمانی و دامنه مجوزها
        </p>
      </header>

      <div className="shirazeh-security-hub__grid">
        <Link
          to="/shirazeh/security/organization"
          className="shirazeh-security-hub__card"
        >
          <span className="shirazeh-security-hub__icon" aria-hidden="true">
            <Network size={20} strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="shirazeh-security-hub__card-title font-meem">ساختار سازمانی</h3>
            <p className="shirazeh-security-hub__card-text font-meem">
              طراحی سلسله‌مراتب واحدها و افراد با کشیدن و رها کردن — پایهٔ تیم‌ها و گردش تأیید آینده
            </p>
          </div>
        </Link>

        <div className="shirazeh-security-hub__card shirazeh-security-hub__card--muted">
          <span className="shirazeh-security-hub__icon" aria-hidden="true">
            <Shield size={20} strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="shirazeh-security-hub__card-title font-meem">نقش‌ها و مجوزها</h3>
            <p className="shirazeh-security-hub__card-text font-meem">
              RBAC سیستمی — جدا از سمت سازمانی. به‌زودی به همین بخش متصل می‌شود.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
