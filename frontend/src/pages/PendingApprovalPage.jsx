import { Link } from 'react-router-dom';

function PendingApprovalPage() {
    return (
        <div className="pending-container">
            <div className="pending-card">
                <span className="pending-icon">⏳</span>

                <h1 className="pending-title">Application Submitted!</h1>

                <p className="pending-text">
                    Your driver application has been submitted for review.
                    An admin will review your license and approve your account shortly.
                </p>

                <div className="status-badge status-badge--pending">
                    <span className="status-dot"></span>
                    Pending Admin Approval
                </div>

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
