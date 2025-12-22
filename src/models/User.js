// 用户数据模型
const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

class User {
    /**
     * 根据用户名查找用户
     */
    static async findByUsername(username) {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0];
    }

    /**
     * 根据邮箱查找用户
     */
    static async findByEmail(email) {
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );
        return rows[0];
    }

    /**
     * 根据user_id查找用户
     */
    static async findById(userId) {
        const [rows] = await pool.query(
            `SELECT 
                user_id, username, email, school, grade, contact,
                avatar_url, bio, posts_count, status, created_at 
             FROM users 
             WHERE user_id = ?`,
            [userId]
        );
        return rows[0];
    }

    /**
     * 创建新用户
     */
    static async create(userData) {
        const { username, password, email, school, grade, contact, bio } = userData;

        // 密码加密
        const hashedPassword = await bcrypt.hash(password, 10);

        // 插入用户（现在包含contact字段）
        const [result] = await pool.query(
            `INSERT INTO users (username, password_hash, email, school, grade, contact, bio) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [username, hashedPassword, email, school, grade, contact, bio]
        );

        return result.insertId;
    }

    /**
     * 验证密码
     */
    static async verifyPassword(plainPassword, hashedPassword) {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    /**
     * 更新用户信息
     */
    static async update(userId, updateData) {
        const allowedFields = ['school', 'grade', 'contact', 'bio', 'avatar_url'];
        const fields = [];
        const values = [];

        for (const [key, value] of Object.entries(updateData)) {
            if (allowedFields.includes(key) && value !== undefined) {
                fields.push(`${key} = ?`);
                values.push(value);
            }
        }

        if (fields.length === 0) {
            return false;
        }

        values.push(userId);

        const [result] = await pool.query(
            `UPDATE users SET ${fields.join(', ')} WHERE user_id = ?`,
            values
        );

        return result.affectedRows > 0;
    }
}

module.exports = User;
