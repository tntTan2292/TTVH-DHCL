'use strict';

const MIN_LENGTH = 8;

/**
 * RBAC-01 password policy (ATTT): at least 8 characters with an upper-case letter, a lower-case
 * letter and a special character; not the username; not the current password.
 * Returns an array of Vietnamese messages; empty means the password is acceptable.
 */
function validateNewPassword(newPassword, { username = '', isSameAsCurrent = false } = {}) {
    const value = String(newPassword || '');
    const problems = [];
    if (value.length < MIN_LENGTH) problems.push(`Mật khẩu phải có ít nhất ${MIN_LENGTH} ký tự`);
    if (!/[A-Z]/.test(value)) problems.push('Mật khẩu phải có ít nhất một chữ hoa');
    if (!/[a-z]/.test(value)) problems.push('Mật khẩu phải có ít nhất một chữ thường');
    if (!/[^A-Za-z0-9]/.test(value)) problems.push('Mật khẩu phải có ít nhất một ký tự đặc biệt');
    if (username && value.toLowerCase() === String(username).toLowerCase()) problems.push('Mật khẩu không được trùng tên đăng nhập');
    if (isSameAsCurrent) problems.push('Mật khẩu mới phải khác mật khẩu hiện tại');
    return problems;
}

module.exports = { validateNewPassword, MIN_LENGTH };
