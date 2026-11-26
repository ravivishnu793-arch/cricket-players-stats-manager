// Error mapping utility to sanitize database error messages
export const getErrorMessage = (error: any): string => {
  // Log full error for debugging (only visible in developer console)
  console.error('[Admin Error]:', error);
  
  // PostgreSQL error codes
  const pgErrorCode = error?.code;
  
  // Foreign key violation
  if (pgErrorCode === '23503') {
    return 'Cannot delete: This item is referenced by other data. Please remove related items first.';
  }
  
  // Unique violation
  if (pgErrorCode === '23505') {
    return 'This item already exists. Please use a different name or identifier.';
  }
  
  // Check constraint violation
  if (pgErrorCode === '23514') {
    return 'Invalid data: The values provided do not meet the requirements.';
  }
  
  // RLS policy violation
  if (error?.message?.includes('RLS') || error?.message?.includes('row-level security')) {
    return 'Permission denied: You do not have access to perform this action.';
  }
  
  // Storage errors
  if (error?.message?.includes('storage')) {
    return 'File upload failed. Please try again or use a smaller file.';
  }
  
  // Network errors
  if (error?.message?.includes('fetch') || error?.message?.includes('network')) {
    return 'Network error: Please check your internet connection and try again.';
  }
  
  // Generic fallback
  return 'An error occurred. Please try again or contact support if the problem persists.';
};
