import { useAuth } from '../../auth/AuthContext';
import { isAdminRole } from '../../auth/roles';

/**
 * Admin-only, disabled Import affordance. Import itself is out of scope
 * until NETWORK-MANAGEMENT-001 Phase 3 — this button proves the UI-level
 * role gate without implementing any Excel logic.
 */
export default function ImportPendingButton() {
  const { user } = useAuth();
  if (!isAdminRole(user?.role)) return null;

  return (
    <button
      type="button"
      disabled
      title="Import sẽ được triển khai ở NETWORK-MANAGEMENT-001 Phase 3"
      className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg cursor-not-allowed text-sm"
    >
      Import (Phase 3)
    </button>
  );
}
