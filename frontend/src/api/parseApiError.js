const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

// Centralized parsing of the API's approved error shapes (RFC 7807 ProblemDetails /
// ValidationProblemDetails, per docs/authentication/api-spec.md section 8), so every
// page handles API errors the same way instead of each reading Axios errors ad hoc.
export function parseApiError(error) {
  const problem = error?.response?.data;

  if (!problem) {
    return { generalMessage: GENERIC_ERROR_MESSAGE, fieldErrors: {} };
  }

  if (problem.errors) {
    const fieldErrors = {};
    Object.entries(problem.errors).forEach(([field, messages]) => {
      fieldErrors[field.toLowerCase()] = Array.isArray(messages) ? messages[0] : messages;
    });

    return { generalMessage: null, fieldErrors };
  }

  return {
    generalMessage: problem.detail || GENERIC_ERROR_MESSAGE,
    fieldErrors: {},
  };
}
