import { Link } from 'react-router-dom';
import { KeyRound, Network } from 'lucide-react';
import './organization/organization.css';

/**
 * Security settings hub — organization designer + permission matrix.
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

        <Link
          to="/shirazeh/security/permissions"
          className="shirazeh-security-hub__card"
        >
          <span className="shirazeh-security-hub__icon" aria-hidden="true">
            <KeyRound size={20} strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="shirazeh-security-hub__card-title font-meem">نقش‌ها و مجوزها</h3>
            <p className="shirazeh-security-hub__card-text font-meem">
              ماتریس RBAC با تفکیک داده، اقدام و مالی — ذخیره فقط با تأیید صریح
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}
