import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';

function PendingApprovalPage() {
    return (
        /* Driver application review pending thakle ei container screen show korbe layout logic */
        <div className="pending-container">
            <div className="pending-card">
                {/* Visual time/clock icon status indicator logic rendering pointer display */}
                <div className="pending-icon"><Clock size={64} color="var(--accent-secondary)" /></div>

                {/* Successful submission message identifier point visual rendering layout design */}
                <h1 className="pending-title">Application Submitted!</h1>

                {/* Processing status explanation text layout rendering logic pointer display */}
                <p className="pending-text">
                    Your driver application has been submitted for review.
                    An admin will review your license and approve your account shortly.
                </p>

                {/* Admin approval queue identifier badge visuals rendering logic layout display generation */}
                <div className="status-badge status-badge--pending">
                    <span className="status-dot"></span>
                    Pending Admin Approval
                </div>

                {/* Home/Login screen e phire jaoar navigation handler pointer visuals rendering logic layout display */}
                <div style={{ marginTop: 'var(--space-2xl)' }}>
                    <Link to="/login" className="btn btn-secondary">
                        Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default PendingApprovalPage;
