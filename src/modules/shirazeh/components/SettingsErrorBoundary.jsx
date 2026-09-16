import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Keeps Shirazeh master-detail shell mounted when a section page throws.
 */
export default class SettingsErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'خطای پیش‌بینی‌نشده در این بخش تنظیمات',
    };
  }

  componentDidCatch(error, info) {
    console.error('[shirazeh] settings section crashed', error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, message: '' });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="shirazeh-error-panel" role="alert">
          <span className="shirazeh-error-panel__icon" aria-hidden="true">
            <AlertTriangle size={20} strokeWidth={1.75} />
          </span>
          <h3 className="shirazeh-error-panel__title font-meem">این بخش موقتاً قابل نمایش نیست</h3>
          <p className="shirazeh-error-panel__text font-meem">
            {this.state.message}
          </p>
          <button
            type="button"
            className="shirazeh-error-panel__retry font-meem"
            onClick={this.handleRetry}
          >
            تلاش مجدد
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
