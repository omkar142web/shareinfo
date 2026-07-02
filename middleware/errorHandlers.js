import Path from "path";

const ERROR_PAGES = {
  404: "404.html",
  500: "500.html",
};

const FILE_READ_ERROR_PAGE = "fserr.html";

export const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const wantsJson = (req) => {
  return req.path.startsWith("/api/") || req.accepts(["html", "json"]) === "json";
};

const sendErrorPage = (res, viewsPath, statusCode) => {
  const pageName = ERROR_PAGES[statusCode] || ERROR_PAGES[500];
  const pagePath = Path.join(viewsPath, pageName);
  const fileReadErrorPath = Path.join(viewsPath, FILE_READ_ERROR_PAGE);

  return res.status(statusCode).sendFile(pagePath, (err) => {
    if (!err || res.headersSent) return;

    console.error(`Could not read ${pageName}:`, err);

    return res.status(500).sendFile(fileReadErrorPath, (fallbackErr) => {
      if (!fallbackErr || res.headersSent) return;

      console.error(`Could not read ${FILE_READ_ERROR_PAGE}:`, fallbackErr);
      return res.status(500).send("File read error");
    });
  });
};

export const notFoundHandler = (viewsPath) => {
  return (req, res) => {
    if (wantsJson(req)) {
      return res.status(404).json({
        success: false,
        message: "Not found",
      });
    }

    return sendErrorPage(res, viewsPath, 404);
  };
};

export const errorHandler = (viewsPath) => {
  return (err, req, res, next) => {
    if (res.headersSent) {
      return next(err);
    }

    const statusCode = err.statusCode === 404 ? 404 : 500;
    console.error("Error occurred:", err);

    if (wantsJson(req)) {
      return res.status(statusCode).json({
        success: false,
        message: statusCode === 404 ? "Not found" : "Internal Server Error",
      });
    }

    return sendErrorPage(res, viewsPath, statusCode);
  };
};
