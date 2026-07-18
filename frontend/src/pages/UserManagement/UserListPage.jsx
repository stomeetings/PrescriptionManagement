import { useCallback, useEffect, useRef, useState } from 'react';
import PageContainer from '../../components/layout/PageContainer.jsx';
import UserToolbar from '../../components/userManagement/UserToolbar.jsx';
import UserTable from '../../components/userManagement/UserTable.jsx';
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx';
import ResetPasswordDialog from '../../components/userManagement/ResetPasswordDialog.jsx';
import { activateUser, deactivateUser, getUsers, resetPassword, searchUsers } from '../../api/usersApi.js';
import { parseApiError } from '../../api/parseApiError.js';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useNotification } from '../../components/notifications/NotificationContext.jsx';

const DEFAULT_PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

function UserListPage() {
  const { user: currentUser } = useAuth();
  const { showSuccess, showError } = useNotification();

  const [users, setUsers] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sortBy, setSortBy] = useState('createdDate');
  const [sortDirection, setSortDirection] = useState('desc');

  // searchInput updates on every keystroke (for a responsive text field); debouncedSearchTerm
  // only updates 400ms after typing stops, and is what actually drives the API call.
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [confirmAction, setConfirmAction] = useState(null); // { type: 'activate'|'deactivate', user }
  const [isActionProcessing, setIsActionProcessing] = useState(false);

  const [resetPasswordTarget, setResetPasswordTarget] = useState(null);
  const [resetPasswordResult, setResetPasswordResult] = useState('');
  const [isResetPasswordSubmitting, setIsResetPasswordSubmitting] = useState(false);

  // Simple in-memory cache keyed by the exact query - avoids re-hitting the API when
  // paging/sorting back to a combination already seen this session. Cleared on any
  // mutation or explicit Refresh, since a stale cache would be worse than no cache.
  const cacheRef = useRef(new Map());

  const hasActiveFilters = Boolean(searchInput.trim() || roleFilter || statusFilter);
  const hasServerFilters = Boolean(debouncedSearchTerm.trim() || roleFilter || statusFilter);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearchTerm(searchInput);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [searchInput]);

  const fetchUsers = useCallback(
    async ({ bypassCache = false } = {}) => {
      const cacheKey = JSON.stringify({
        page,
        pageSize,
        sortBy,
        sortDirection,
        debouncedSearchTerm,
        roleFilter,
        statusFilter,
      });

      if (!bypassCache && cacheRef.current.has(cacheKey)) {
        const cached = cacheRef.current.get(cacheKey);
        setUsers(cached.items);
        setTotalCount(cached.totalCount);
        setTotalPages(cached.totalPages);
        setError('');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const result = hasServerFilters
          ? await searchUsers({
              searchTerm: debouncedSearchTerm.trim() || null,
              roleCode: roleFilter || null,
              status: statusFilter || null,
              page,
              pageSize,
              sortBy,
              sortDirection,
            })
          : await getUsers({ page, pageSize, sortBy, sortDirection });

        cacheRef.current.set(cacheKey, result);
        setUsers(result.items);
        setTotalCount(result.totalCount);
        setTotalPages(result.totalPages);
      } catch (fetchError) {
        const { generalMessage } = parseApiError(fetchError);
        setError(generalMessage || 'Unable to load users. Please try again.');
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, sortBy, sortDirection, debouncedSearchTerm, roleFilter, statusFilter, hasServerFilters],
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  function handleSort(column) {
    if (column === sortBy) {
      setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
    setPage(1);
  }

  function handleToggleSortDirection() {
    setSortDirection((direction) => (direction === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  }

  function handleRoleFilterChange(value) {
    setRoleFilter(value);
    setPage(1);
  }

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setPage(1);
  }

  function handleClearFilters() {
    setSearchInput('');
    setDebouncedSearchTerm('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(1);
  }

  function handlePageSizeChange(newPageSize) {
    setPageSize(newPageSize);
    setPage(1);
  }

  function handleRefresh() {
    cacheRef.current.clear();
    fetchUsers({ bypassCache: true });
  }

  function requestActivate(targetUser) {
    setConfirmAction({ type: 'activate', user: targetUser });
  }

  function requestDeactivate(targetUser) {
    setConfirmAction({ type: 'deactivate', user: targetUser });
  }

  async function handleConfirmAction() {
    if (!confirmAction) {
      return;
    }

    setIsActionProcessing(true);

    try {
      if (confirmAction.type === 'activate') {
        await activateUser(confirmAction.user.userAccountId);
        showSuccess(`${confirmAction.user.fullName} was activated.`);
      } else {
        await deactivateUser(confirmAction.user.userAccountId);
        showSuccess(`${confirmAction.user.fullName} was deactivated.`);
      }

      setConfirmAction(null);
      cacheRef.current.clear();
      await fetchUsers({ bypassCache: true });
    } catch (actionError) {
      const { generalMessage } = parseApiError(actionError);
      showError(generalMessage || 'Unable to complete this action. Please try again.');
      setConfirmAction(null);
    } finally {
      setIsActionProcessing(false);
    }
  }

  function requestResetPassword(targetUser) {
    setResetPasswordTarget(targetUser);
    setResetPasswordResult('');
  }

  async function handleConfirmResetPassword() {
    if (!resetPasswordTarget) {
      return;
    }

    setIsResetPasswordSubmitting(true);

    try {
      const result = await resetPassword(resetPasswordTarget.userAccountId);
      setResetPasswordResult(result.temporaryPassword);
      showSuccess(`Password reset for ${resetPasswordTarget.username}.`);
    } catch (resetError) {
      const { generalMessage } = parseApiError(resetError);
      showError(generalMessage || 'Unable to reset the password. Please try again.');
      setResetPasswordTarget(null);
    } finally {
      setIsResetPasswordSubmitting(false);
    }
  }

  function closeResetPasswordDialog() {
    setResetPasswordTarget(null);
    setResetPasswordResult('');
  }

  return (
    <PageContainer title="User Management">
      <UserToolbar
        searchTerm={searchInput}
        onSearchTermChange={setSearchInput}
        roleFilter={roleFilter}
        onRoleFilterChange={handleRoleFilterChange}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSortByChange={(value) => handleSort(value)}
        onToggleSortDirection={handleToggleSortDirection}
        onRefresh={handleRefresh}
      />

      <UserTable
        users={users}
        isLoading={isLoading}
        error={error}
        onRetry={() => fetchUsers({ bypassCache: true })}
        sortBy={sortBy}
        sortDirection={sortDirection}
        onSort={handleSort}
        onActivate={requestActivate}
        onDeactivate={requestDeactivate}
        onResetPassword={requestResetPassword}
        currentUserAccountId={currentUser?.userAccountId}
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      <ConfirmDialog
        show={Boolean(confirmAction)}
        title={confirmAction?.type === 'activate' ? 'Activate User' : 'Deactivate User'}
        message={
          confirmAction?.type === 'activate'
            ? `Activate ${confirmAction?.user?.fullName}? They will be able to log in immediately.`
            : `Deactivate ${confirmAction?.user?.fullName}? They will no longer be able to log in.`
        }
        confirmLabel={confirmAction?.type === 'activate' ? 'Activate' : 'Deactivate'}
        confirmVariant={confirmAction?.type === 'activate' ? 'success' : 'warning'}
        onConfirm={handleConfirmAction}
        onCancel={() => setConfirmAction(null)}
        isProcessing={isActionProcessing}
      />

      <ResetPasswordDialog
        show={Boolean(resetPasswordTarget)}
        username={resetPasswordTarget?.username}
        isSubmitting={isResetPasswordSubmitting}
        temporaryPassword={resetPasswordResult}
        onConfirm={handleConfirmResetPassword}
        onClose={closeResetPasswordDialog}
      />
    </PageContainer>
  );
}

export default UserListPage;
