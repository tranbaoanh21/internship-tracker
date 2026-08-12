import { AppError } from '../errors/AppError.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `No route matches ${req.method} ${req.originalUrl}`,
    },
  });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    const body = {
      error: {
        code: error.code,
        message: error.message,
      },
    };

    if (error.fields) {
      body.error.fields = error.fields;
    }

    res.status(error.status).json(body);
    return;
  }

  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'The request body must be valid JSON.',
      },
    });
    return;
  }

  if (error?.type === 'entity.too.large') {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'The request body exceeds the 32kb limit.',
      },
    });
    return;
  }

  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
    res.status(error.status).json({
      error: {
        code: 'INVALID_REQUEST',
        message: error.message || 'The request could not be parsed.',
      },
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'The server could not complete the request.',
    },
  });
}
