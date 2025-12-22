// 统一响应格式工具

/**
 * 成功响应
 */
const success = (res, data = null, message = '操作成功', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        timestamp: new Date().toISOString()
    });
};

/**
 * 失败响应
 */
const error = (res, message = '操作失败', statusCode = 400, errors = null) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors,
        timestamp: new Date().toISOString()
    });
};

/**
 * 分页响应
 */
const paginate = (res, data, pagination) => {
    return res.status(200).json({
        success: true,
        data,
        pagination,
        timestamp: new Date().toISOString()
    });
};

module.exports = {
    success,
    error,
    paginate
};
