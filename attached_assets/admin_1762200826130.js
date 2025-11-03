const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const QRCode = require('qrcode');
const router = express.Router();
const { q } = require('../db/query.js');
const googleMapsService = require('../../shared/services/googleMaps');
const { ObjectStorageService } = require('../objectStorage.js');
const { adminAuthMiddleware, JWT_SECRET } = require('../middleware/adminAuth');

// 使用统一的管理员认证中间件
const adminAuth = adminAuthMiddleware;

// 初始化对象存储服务
const objectStorageService = new ObjectStorageService();

// LINE ID Token验证函数 - 获取用户信息包括手机号
async function verifyLineIdToken(idToken, channelId) {
  try {
    if (!idToken) {
      throw new Error('ID token is required');
    }
    
    // 调用LINE的ID token验证API (使用GET方法)
    const response = await axios.get('https://api.line.me/oauth2/v2.1/verify', {
      params: {
        id_token: idToken,
        client_id: channelId
      }
    });
    
    const tokenData = response.data;
    
    // 验证token的有效性
    if (!tokenData.sub || !tokenData.name) {
      throw new Error('Invalid token data');
    }
    
    // 尝试从ID Token中直接获取手机号（需要正确的scope配置）
    let phoneNumber = tokenData.phone_number || null;
    
    // 如果ID Token中没有手机号，记录警告
    if (!phoneNumber) {
      console.warn('⚠️ ID Token中未包含手机号信息。请确保LIFF应用配置了正确的scope: "openid profile phone"');
    }
    
    return {
      userId: tokenData.sub,
      displayName: tokenData.name,
      email: tokenData.email || null,
      phoneNumber: phoneNumber
    };
  } catch (error) {
    console.error('LINE ID token verification failed:', error.response?.data || error.message);
    throw new Error('Invalid LINE ID token');
  }
}

// 管理员登录已迁移到 admin.auth.js，此处不再重复定义
// 使用统一的登录接口: POST /api/admin/login (在 admin.auth.js 中)

// 权限中间件：仅超级管理员
const requireSuperAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin' && req.admin?.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: '需要超级管理员权限'
    });
  }
  next();
};

// 权限中间件：内容运营员或更高
const requireContentAccess = (req, res, next) => {
  const role = req.user?.role || req.admin?.role;
  const allowedRoles = ['admin', 'super_admin', 'content_operator'];
  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: '权限不足'
    });
  }
  next();
};

// 获取仪表板数据 - 需要管理员认证
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // 返回模拟的仪表板数据（避免数据库超时）
    const dashboardData = {
      stats: {
        totalRevenue: 234501,
        totalOrders: 1284, 
        totalUsers: 8954,
        growthRate: 3.7
      },
      message: '仪表板数据获取成功'
    }
    
    res.json({
      success: true,
      data: dashboardData
    })
  } catch (error) {
    console.error('获取仪表板数据错误:', error)
    res.status(500).json({
      success: false,
      message: '获取仪表板数据失败'
    })
  }
})

// 获取仪表板统计数据
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    // 获取各种统计数据
    const [couponsResult, storesResult, usersResult, redemptionsResult] = await Promise.all([
      q('SELECT COUNT(*) as total FROM coupons'),
      q('SELECT COUNT(*) as total FROM stores WHERE status = $1', ['active']),
      q('SELECT COUNT(*) as total FROM users'),
      q('SELECT COUNT(*) as total FROM redemptions')
    ]);

    const stats = {
      totalCoupons: parseInt(couponsResult.rows[0].total),
      totalStores: parseInt(storesResult.rows[0].total),
      totalUsers: parseInt(usersResult.rows[0].total),
      totalRedemptions: parseInt(redemptionsResult.rows[0].total)
    };

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('获取统计数据错误:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

// 门店管理
router.get('/stores', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await q(`
      SELECT id, name, address, lat, lng, image_url, code, status, 
             city, google_place_id, rating, opening_hours, phone, website,
             created_at, updated_at
      FROM stores
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await q('SELECT COUNT(*) as total FROM stores WHERE status = \'active\'');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取门店列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取门店列表失败'
    });
  }
});

// 获取门店数量统计（用于生成门店编码）
router.get('/stores/count', adminAuth, async (req, res) => {
  try {
    const { province_code, district_code } = req.query;
    
    let query = 'SELECT COUNT(*) as count FROM stores WHERE status = $1';
    let params = ['active'];
    
    // 如果提供了府和县/区编码，统计该府县的门店数量
    if (province_code && district_code) {
      query += ' AND code LIKE $2';
      params.push(`${province_code}${district_code}%`);
    } else if (province_code) {
      // 只提供府编码，统计该府所有门店
      query += ' AND code LIKE $2';
      params.push(`${province_code}%`);
    }
    
    const result = await q(query, params);
    const count = parseInt(result.rows[0].count) || 0;
    
    console.log(`门店数量统计: 府=${province_code}, 县/区=${district_code}, 数量=${count}`);
    
    res.json({
      success: true,
      count: count
    });
    
  } catch (error) {
    console.error('获取门店数量统计错误:', error);
    res.status(500).json({
      success: false,
      message: '获取门店数量统计失败',
      count: 0
    });
  }
});


// 用户管理
router.get('/users', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await q(`
      SELECT id, line_id, nickname, avatar, is_following, language, created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await q('SELECT COUNT(*) as total FROM users');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取用户列表失败'
    });
  }
});

// 核销记录管理
router.get('/redemptions', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await q(`
      SELECT 
        r.id,
        r.verification_method,
        r.redeemed_at,
        r.notes,
        u.nickname as user_name,
        u.line_id,
        s.name as store_name,
        c.title as coupon_title,
        c.discount_price,
        v.nickname as verifier_name
      FROM redemptions r
      LEFT JOIN user_coupons uc ON r.user_coupon_id = uc.id
      LEFT JOIN users u ON uc.user_id = u.id
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      LEFT JOIN stores s ON r.store_id = s.id
      LEFT JOIN users v ON r.verifier_id = v.id
      ORDER BY r.redeemed_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await q('SELECT COUNT(*) as total FROM redemptions');
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取核销记录错误:', error);
    res.status(500).json({
      success: false,
      message: '获取核销记录失败'
    });
  }
});

// Google Maps 集成接口

// Places Autocomplete - 地址自动补全
router.get('/places/autocomplete', adminAuth, async (req, res) => {
  try {
    const { input } = req.query;
    
    if (!input || input.trim().length < 2) {
      return res.json({
        success: true,
        data: []
      });
    }

    const suggestions = await googleMapsService.getPlaceAutocomplete(input, {
      types: 'establishment',
      components: 'country:th',
      language: 'th'  // 支持泰语地址识别
    });

    res.json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error('地址自动补全错误:', error);
    res.status(500).json({
      success: false,
      message: '地址自动补全失败'
    });
  }
});

// Place Details - 获取地点详细信息
router.get('/places/details', adminAuth, async (req, res) => {
  try {
    const { placeId } = req.query;
    
    if (!placeId) {
      return res.status(400).json({
        success: false,
        message: '缺少地点ID参数'
      });
    }

    const placeDetails = await googleMapsService.getPlaceDetails(placeId, {
      fields: 'name,formatted_address,geometry,rating,opening_hours,formatted_phone_number,website,address_components',
      language: 'th'  // 支持泰语门店信息获取
    });

    if (!placeDetails) {
      return res.status(404).json({
        success: false,
        message: '未找到地点信息'
      });
    }

    // 调试：打印营业时间信息
    console.log('🔍 营业时间调试信息:', {
      openingHours: placeDetails.openingHours,
      hasOpeningHours: !!placeDetails.openingHours,
      weekdayText: placeDetails.openingHours?.weekdayText,
      openNow: placeDetails.openingHours?.openNow
    });

    // 提取城市信息 - 使用多种方法
    let city = '';
    
    // 方法1：从Places API的地址组件中提取（如果可用）
    if (placeDetails.addressComponents) {
      city = googleMapsService.extractCityFromComponents(placeDetails.addressComponents);
      console.log('🏙️ 从Places API地址组件获取城市:', city);
    }
    
    // 方法2：从formatted_address解析
    if (!city && placeDetails.address) {
      const addressParts = placeDetails.address.split(',').map(part => part.trim());
      // 通常城市在倒数第2个位置（最后一个是国家/邮编）
      if (addressParts.length >= 2) {
        city = addressParts[addressParts.length - 2];
        // 去掉可能的邮编
        city = city.replace(/\d{5}.*$/, '').trim();
        console.log('🏙️ 从地址解析获取城市:', city);
      }
    }
    
    // 方法3：如果还是没有，尝试反向地理编码（作为最后手段）
    if (!city) {
      try {
        const geocodeResult = await googleMapsService.reverseGeocode(placeDetails.lat, placeDetails.lng);
        city = geocodeResult ? 
          googleMapsService.extractCityFromComponents(geocodeResult.addressComponents) : '';
        console.log('🏙️ 从反向地理编码获取城市:', city);
      } catch (error) {
        console.log('⚠️ 反向地理编码失败，但已尝试其他方法获取城市信息');
      }
    }

    const enrichedDetails = {
      ...placeDetails,
      city,
      placeId
    };

    res.json({
      success: true,
      data: enrichedDetails
    });

  } catch (error) {
    console.error('获取地点详情错误:', error);
    res.status(500).json({
      success: false,
      message: '获取地点详情失败'
    });
  }
});

// 添加门店
router.post('/stores', adminAuth, async (req, res) => {
  try {
    const {
      name,
      address,
      lat,
      lng,
      image_url,
      code,
      city,
      google_place_id,
      rating,
      opening_hours,
      phone,
      website
    } = req.body;

    // 验证必填字段
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: '门店名称和地址为必填项'
      });
    }

    // 使用健壮的数据库查询 (带重试机制)
    const result = await q(`
      INSERT INTO stores 
      (name, address, lat, lng, image_url, code, city, google_place_id, rating, opening_hours, phone, website, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW(), NOW())
      RETURNING *
    `, [
      name,
      address,
      lat || null,
      lng || null,
      image_url || null,
      code || null,
      city || null,
      google_place_id || null,
      rating || null,
      opening_hours || null,
      phone || null,
      website || null
    ]);

    console.log('✅ 门店添加成功:', name);

    res.json({
      success: true,
      message: '门店添加成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('添加门店错误:', error);
    res.status(500).json({
      success: false,
      message: '添加门店失败'
    });
  }
});

// 更新门店
router.put('/stores/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      address,
      lat,
      lng,
      image_url,
      code,
      city,
      google_place_id,
      rating,
      opening_hours,
      phone,
      website,
      status
    } = req.body;

    // 验证必填字段
    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: '门店名称和地址为必填项'
      });
    }

    // 更新门店
    const result = await q(`
      UPDATE stores 
      SET name = $1, address = $2, lat = $3, lng = $4, image_url = $5, code = $6,
          city = $7, google_place_id = $8, rating = $9, opening_hours = $10, 
          phone = $11, website = $12, status = $13, updated_at = NOW()
      WHERE id = $14
      RETURNING *
    `, [
      name,
      address,
      lat || null,
      lng || null,
      image_url || null,
      code || null,
      city || null,
      google_place_id || null,
      rating || null,
      opening_hours || null,
      phone || null,
      website || null,
      status || 'active',
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '门店不存在'
      });
    }

    res.json({
      success: true,
      message: '门店更新成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('更新门店错误:', error);
    res.status(500).json({
      success: false,
      message: '更新门店失败'
    });
  }
});

// 删除门店
router.delete('/stores/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 软删除门店 (使用健壮查询)
    const result = await q(`
      UPDATE stores 
      SET status = 'inactive', updated_at = NOW()
      WHERE id = $1
      RETURNING id, name
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '门店不存在'
      });
    }

    res.json({
      success: true,
      message: '门店删除成功'
    });

  } catch (error) {
    console.error('删除门店错误:', error);
    res.status(500).json({
      success: false,
      message: '删除门店失败'
    });
  }
});

// ================== 活动管理 API ==================

// 获取活动列表
router.get('/campaigns', adminAuth, async (req, res) => {
  const { enhanceCouponWithPricing } = require('../utils/couponPricing');
  
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    const result = await q(`
      SELECT id, title, description, image_url, media_files, 
             coupon_type, category, original_price, discount_price, price_final, face_value, 
             amount_off, min_spend, discount_percent, cap_amount, currency,
             quantity, claimed_count, redeemed_count, valid_from, valid_to, 
             staff_sop, staff_notes,
             status, created_at, updated_at
      FROM coupons
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, [...params, limit, offset]);

    const countResult = await q(`
      SELECT COUNT(*) as total FROM coupons ${whereClause}
    `, params);
    const total = parseInt(countResult.rows[0].total);

    // 为每个券添加价格摘要
    const enhancedCoupons = result.rows.map(coupon => enhanceCouponWithPricing(coupon));

    res.json({
      success: true,
      data: enhancedCoupons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取活动列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取活动列表失败'
    });
  }
});

// 添加活动
router.post('/campaigns', adminAuth, async (req, res) => {
  const { validateCouponPricing, enhanceCouponWithPricing } = require('../utils/couponPricing');
  const { translateCoupon } = require('../translate');
  
  try {
    const {
      title,
      description,
      coupon_type = 'final_price',
      category,
      // 原有字段（向后兼容）
      original_price,
      discount_price,
      // 新的价格字段
      price_final,
      face_value,
      amount_off,
      min_spend,
      discount_percent,
      cap_amount,
      currency = 'CNY',
      // 其他字段
      quantity,
      valid_from,
      valid_to,
      image_url,
      media_files,
      status
    } = req.body;

    // 验证基本必填字段
    if (!title || !description || !quantity || !valid_from || !valid_to || !category) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段：标题、描述、行业类目、数量、有效期'
      });
    }

    // 验证category字段的有效性
    const validCategories = ['recommend', '3c', 'fashion', 'food', 'beauty', 'nails', 'mom'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: '请选择有效的行业类目'
      });
    }

    // 验证券类型相关字段
    const pricingValidation = validateCouponPricing(req.body);
    if (!pricingValidation.valid) {
      return res.status(400).json({
        success: false,
        message: '价格设置错误',
        errors: pricingValidation.errors
      });
    }

    // 🌐 使用 OpenAI 自动翻译成三种语言
    console.log('🌐 开始使用 OpenAI 翻译优惠券内容...');
    let translatedContent = {};
    
    try {
      // 调用 OpenAI 翻译 API
      translatedContent = await translateCoupon(title, description);
      
      console.log('✅ OpenAI 翻译完成，包含所有3种语言版本');
      console.log('翻译结果预览:', {
        title_zh_cn: translatedContent.title_zh_cn ? '✅' : '❌',
        title_en_us: translatedContent.title_en_us ? '✅' : '❌', 
        title_th_th: translatedContent.title_th_th ? '✅' : '❌'
      });
    } catch (error) {
      console.error('⚠️ OpenAI 翻译失败，仅保存原始内容:', error.message);
      // 翻译失败时，检测输入语言并保存
      const detectedLang = /[\u4e00-\u9fff]/.test(title) ? 'zh-cn' : 
                          /[ก-๙]/.test(title) ? 'th-th' : 'en-us';
      
      translatedContent = {
        [`title_${detectedLang.replace('-', '_')}`]: title,
        [`description_${detectedLang.replace('-', '_')}`]: description
      };
      
      // 其他语言字段设为null
      const allLangs = ['zh-cn', 'en-us', 'th-th'];
      allLangs.forEach(lang => {
        const suffix = lang.replace('-', '_');
        if (lang !== detectedLang) {
          translatedContent[`title_${suffix}`] = null;
          translatedContent[`description_${suffix}`] = null;
        }
      });
    }

    // 开启事务处理活动和门店关联
    const { pool } = require('../db')
    let client;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      // 插入新活动（包含多语言字段）
      const result = await q(`
        INSERT INTO coupons 
        (title, description, coupon_type, category,
         title_zh_cn, title_en_us, title_th_th,
         description_zh_cn, description_en_us, description_th_th,
         original_price, discount_price, price_final, face_value, amount_off, 
         min_spend, discount_percent, cap_amount, currency,
         quantity, valid_from, valid_to, image_url, media_files, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW())
        RETURNING *
      `, [
        title,
        description,
        coupon_type,
        category,
        translatedContent.title_zh_cn || title,
        translatedContent.title_en_us || null, // 不回退到中文
        translatedContent.title_th_th || null, // 不回退到中文
        translatedContent.description_zh_cn || description,
        translatedContent.description_en_us || null, // 不回退到中文
        translatedContent.description_th_th || null, // 不回退到中文
        original_price || null,
        discount_price || null,
        price_final || null,
        face_value || null,
        amount_off || null,
        min_spend || null,
        discount_percent || null,
        cap_amount || null,
        currency,
        quantity,
        valid_from,
        valid_to,
        image_url || null,
        media_files ? JSON.stringify(media_files) : null,
        status || 'active'
      ]);

      const newCoupon = result.rows[0];

      // 添加门店关联
      if (req.body.store_ids && req.body.store_ids.length > 0) {
        for (const store_id of req.body.store_ids) {
          await q(`
            INSERT INTO coupon_stores (coupon_id, store_id, created_at)
            VALUES ($1, $2, NOW())
          `, [newCoupon.id, store_id]);
        }
      }

      await client.query('COMMIT');

      // 返回增强的券数据
      const enhancedCoupon = enhanceCouponWithPricing(newCoupon);

      res.json({
        success: true,
        message: '活动添加成功',
        data: enhancedCoupon
      });

    } catch (error) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('事务回滚失败:', rollbackError.message);
        }
      }
      throw error;
    } finally {
      if (client) {
        client.release();
      }
    }

  } catch (error) {
    console.error('添加活动错误:', error);
    res.status(500).json({
      success: false,
      message: '添加活动失败'
    });
  }
});

// 更新活动
router.put('/campaigns/:id', adminAuth, async (req, res) => {
  const { validateCouponPricing, enhanceCouponWithPricing } = require('../utils/couponPricing');
  const { translateCoupon } = require('../translate');
  
  try {
    const { id } = req.params;
    const {
      title,
      description,
      coupon_type = 'final_price',
      category,
      // 原有字段（向后兼容）
      original_price,
      discount_price,
      // 新的价格字段
      price_final,
      face_value,
      amount_off,
      min_spend,
      discount_percent,
      cap_amount,
      currency = 'CNY',
      // 其他字段
      quantity,
      valid_from,
      valid_to,
      image_url,
      media_files,
      status
    } = req.body;

    // 验证基本必填字段
    if (!title || !description || !quantity || !valid_from || !valid_to || !category) {
      return res.status(400).json({
        success: false,
        message: '请填写所有必填字段：标题、描述、行业类目、数量、有效期'
      });
    }

    // 验证category字段的有效性
    const validCategories = ['recommend', '3c', 'fashion', 'food', 'beauty', 'nails', 'mom'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: '请选择有效的行业类目'
      });
    }

    // 验证券类型相关字段
    const pricingValidation = validateCouponPricing(req.body);
    if (!pricingValidation.valid) {
      return res.status(400).json({
        success: false,
        message: '价格设置错误',
        errors: pricingValidation.errors
      });
    }

    // 🌐 使用 OpenAI 自动翻译成三种语言（更新时）
    console.log('🌐 开始使用 OpenAI 翻译更新的优惠券内容...');
    let translatedContent = {};
    try {
      // 调用 OpenAI 翻译 API
      translatedContent = await translateCoupon(title, description);
      
      console.log('✅ OpenAI 更新翻译完成，包含所有3种语言版本');
      console.log('翻译结果预览:', {
        title_zh_cn: translatedContent.title_zh_cn ? '✅' : '❌',
        title_en_us: translatedContent.title_en_us ? '✅' : '❌', 
        title_th_th: translatedContent.title_th_th ? '✅' : '❌'
      });
    } catch (error) {
      console.error('⚠️ OpenAI 更新翻译失败，仅保存原始内容:', error.message);
      // 翻译失败时的备选方案
      const fallbackLang = /[\u4e00-\u9fff]/.test(title) ? 'zh-cn' : 
                          /[ก-๙]/.test(title) ? 'th-th' : 'en-us';
      
      translatedContent = {
        [`title_${fallbackLang.replace('-', '_')}`]: title,
        [`description_${fallbackLang.replace('-', '_')}`]: description
      };
      
      // 其他语言字段设为null，避免污染
      const allLangs = ['zh-cn', 'en-us', 'th-th'];
      allLangs.forEach(lang => {
        const suffix = lang.replace('-', '_');
        if (lang !== fallbackLang) {
          translatedContent[`title_${suffix}`] = null;
          translatedContent[`description_${suffix}`] = null;
        }
      });
    }

    const result = await q(`
      UPDATE coupons 
      SET title = $1, description = $2, coupon_type = $3, category = $4,
          title_zh_cn = $5, title_en_us = $6, title_th_th = $7,
          description_zh_cn = $8, description_en_us = $9, description_th_th = $10,
          original_price = $11, discount_price = $12, price_final = $13, face_value = $14, amount_off = $15,
          min_spend = $16, discount_percent = $17, cap_amount = $18, currency = $19,
          quantity = $20, valid_from = $21, valid_to = $22, image_url = $23, 
          media_files = $24, status = $25, updated_at = NOW()
      WHERE id = $26
      RETURNING *
    `, [
      title,
      description,
      coupon_type,
      category,
      translatedContent.title_zh_cn || null,
      translatedContent.title_en_us || null,
      translatedContent.title_th_th || null,
      translatedContent.description_zh_cn || null,
      translatedContent.description_en_us || null,
      translatedContent.description_th_th || null,
      original_price || null,
      discount_price || null,
      price_final || null,
      face_value || null,
      amount_off || null,
      min_spend || null,
      discount_percent || null,
      cap_amount || null,
      currency,
      quantity,
      valid_from,
      valid_to,
      image_url || null,
      media_files ? JSON.stringify(media_files) : null,
      status || 'active',
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    // 返回增强的券数据
    const enhancedCoupon = enhanceCouponWithPricing(result.rows[0]);

    res.json({
      success: true,
      message: '活动更新成功',
      data: enhancedCoupon
    });

  } catch (error) {
    console.error('更新活动错误:', error);
    res.status(500).json({
      success: false,
      message: '更新活动失败'
    });
  }
});

// 更新活动指南（员工操作说明）
router.put('/campaigns/:id/staff-guide', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { staff_sop, staff_notes } = req.body;

    console.log(`📝 更新活动指南: ID=${id}`);
    console.log('  - SOP字段长度:', staff_sop?.length || 0);
    console.log('  - 注意事项字段长度:', staff_notes?.length || 0);

    const result = await q(`
      UPDATE coupons 
      SET staff_sop = $1, 
          staff_notes = $2, 
          updated_at = NOW()
      WHERE id = $3
      RETURNING id, title, staff_sop, staff_notes
    `, [
      staff_sop || null,
      staff_notes || null,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    console.log(`✅ 活动指南更新成功: ${result.rows[0].title}`);

    res.json({
      success: true,
      message: '活动指南更新成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('更新活动指南错误:', error);
    res.status(500).json({
      success: false,
      message: '更新活动指南失败'
    });
  }
});

// 删除活动
router.delete('/campaigns/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 真正删除活动（硬删除）
    // 由于设置了CASCADE外键约束，相关记录会自动删除：
    // - coupon_stores（门店关联）会被删除
    // - user_coupons（用户优惠券）会被删除
    // - redemptions（核销记录）会跟着用户优惠券一起被删除
    
    const result = await q(`
      DELETE FROM coupons 
      WHERE id = $1
      RETURNING id, title
    `, [id]);

    if (result.rows.length === 0) {
      console.log(`⚠️ 活动不存在: ID=${id}`);
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }

    console.log(`✅ 活动已删除: ${result.rows[0].title} (ID: ${id})`);

    res.json({
      success: true,
      message: '活动删除成功'
    });

  } catch (error) {
    console.error('删除活动错误:', error);
    res.status(500).json({
      success: false,
      message: '删除活动失败'
    });
  }
});

// ================== 核销管理 API ==================

// 获取核销统计数据
router.get('/redemptions/stats', adminAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const [totalResult, todayResult, valueResult] = await Promise.all([
      safeQuery('SELECT COUNT(*) as total FROM redemptions'),
      safeQuery('SELECT COUNT(*) as today FROM redemptions WHERE DATE(redeemed_at) = $1', [today]),
      safeQuery('SELECT SUM(c.discount_price) as total_value FROM redemptions r LEFT JOIN user_coupons uc ON r.user_coupon_id = uc.id LEFT JOIN coupons c ON uc.coupon_id = c.id')
    ]);

    // 计算日均核销数
    const firstRedemptionResult = await q('SELECT MIN(redeemed_at) as first_redemption FROM redemptions');
    const firstRedemption = firstRedemptionResult.rows[0]?.first_redemption;
    let avgPerDay = 0;
    
    if (firstRedemption) {
      const daysSinceFirst = Math.ceil((new Date() - new Date(firstRedemption)) / (1000 * 60 * 60 * 24));
      if (daysSinceFirst > 0) {
        avgPerDay = Math.round(parseInt(totalResult.rows[0].total) / daysSinceFirst);
      }
    }

    res.json({
      success: true,
      stats: {
        total: parseInt(totalResult.rows[0].total),
        today: parseInt(todayResult.rows[0].today),
        totalValue: parseFloat(valueResult.rows[0].total_value) || 0,
        avgPerDay
      }
    });

  } catch (error) {
    console.error('获取核销统计数据错误:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败'
    });
  }
});

// 获取核销记录列表 (已存在，保持原有功能)

// 导出核销记录
router.get('/redemptions/export', adminAuth, async (req, res) => {
  try {
    const search = req.query.search || '';
    const store_id = req.query.store_id || '';
    const method = req.query.method || '';
    const date_from = req.query.date_from || '';
    const date_to = req.query.date_to || '';

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (u.nickname ILIKE $${paramIndex} OR c.title ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (store_id) {
      whereClause += ` AND r.store_id = $${paramIndex}`;
      params.push(store_id);
      paramIndex++;
    }

    if (method) {
      whereClause += ` AND r.verification_method = $${paramIndex}`;
      params.push(method);
      paramIndex++;
    }

    if (date_from && date_to) {
      whereClause += ` AND DATE(r.redeemed_at) BETWEEN $${paramIndex} AND $${paramIndex + 1}`;
      params.push(date_from, date_to);
      paramIndex += 2;
    }

    const result = await q(`
      SELECT 
        r.id,
        r.verification_method,
        r.redeemed_at,
        r.notes,
        u.nickname as user_name,
        u.line_id,
        s.name as store_name,
        c.title as coupon_title,
        c.discount_price,
        v.nickname as verifier_name
      FROM redemptions r
      LEFT JOIN user_coupons uc ON r.user_coupon_id = uc.id
      LEFT JOIN users u ON uc.user_id = u.id
      LEFT JOIN coupons c ON uc.coupon_id = c.id
      LEFT JOIN stores s ON r.store_id = s.id
      LEFT JOIN users v ON r.verifier_id = v.id
      ${whereClause}
      ORDER BY r.redeemed_at DESC
    `, params);

    // 这里应该生成Excel文件，但为了简化，先返回JSON数据
    // 在实际生产环境中，可以使用如xlsx库来生成Excel文件
    res.json({
      success: true,
      message: '导出功能已启动',
      data: result.rows
    });

  } catch (error) {
    console.error('导出核销记录错误:', error);
    res.status(500).json({
      success: false,
      message: '导出核销记录失败'
    });
  }
});

// 员工预设管理API (方案D)
// 获取指定门店的员工预设列表
router.get('/stores/:storeId/staff-presets', adminAuth, async (req, res) => {
  try {
    const storeId = req.params.storeId;
    
    // 验证门店ID格式
    if (!storeId || isNaN(parseInt(storeId))) {
      return res.status(400).json({
        success: false,
        message: '无效的门店ID'
      });
    }
    
    // 使用优化的查询，聚合绑定信息避免重复数据
    const result = await q(`
      SELECT 
        sp.id, 
        sp.staff_id, 
        sp.name, 
        sp.department, 
        sp.position, 
        sp.status,
        sp.created_at, 
        sp.updated_at,
        COALESCE(
          JSON_AGG(
            CASE 
              WHEN sb.id IS NOT NULL THEN 
                JSON_BUILD_OBJECT(
                  'binding_id', sb.id,
                  'line_user_id', sb.line_user_id,
                  'display_name', sb.display_name,
                  'binding_status', sb.binding_status,
                  'bound_at', sb.bound_at,
                  'last_active_at', sb.last_active_at
                )
              ELSE NULL
            END
          ) FILTER (WHERE sb.id IS NOT NULL), 
          '[]'
        ) as bindings
      FROM staff_presets sp
      LEFT JOIN staff_bindings sb ON sp.id = sb.preset_id AND sb.binding_status = 'bound'
      WHERE sp.store_id = $1
      GROUP BY sp.id, sp.staff_id, sp.name, sp.department, sp.position, sp.status, sp.created_at, sp.updated_at
      ORDER BY sp.created_at DESC
    `, [storeId]);

    res.json({
      success: true,
      data: result.rows
    });

  } catch (error) {
    console.error('获取员工预设列表错误:', error);
    res.status(500).json({
      success: false,
      message: '获取员工预设列表失败'
    });
  }
});

// 为指定门店添加员工预设
router.post('/stores/:storeId/staff-presets', adminAuth, async (req, res) => {
  try {
    const storeId = req.params.storeId;
    const { staffList } = req.body;

    // 验证门店ID格式
    if (!storeId || isNaN(parseInt(storeId))) {
      return res.status(400).json({
        success: false,
        message: '无效的门店ID'
      });
    }

    if (!staffList || !Array.isArray(staffList) || staffList.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请提供有效的员工信息'
      });
    }

    // 限制批量大小防止滥用
    if (staffList.length > 50) {
      return res.status(400).json({
        success: false,
        message: '单次最多只能添加50名员工'
      });
    }

    // 验证所有员工信息都有效
    for (const staff of staffList) {
      // 姓名必填
      if (!staff.name || staff.name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '员工姓名不能为空'
        });
      }
      
      // 工号必填和格式验证
      if (!staff.staff_id || staff.staff_id.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '员工工号不能为空'
        });
      }
      
      // 电话号码必填和格式验证
      if (!staff.phone || staff.phone.trim() === '') {
        return res.status(400).json({
          success: false,
          message: '员工电话号码不能为空'
        });
      }
      
      const phone = staff.phone.trim();
      if (phone.length < 6 || phone.length > 20) {
        return res.status(400).json({
          success: false,
          message: '电话号码长度必须在6-20字符之间'
        });
      }
      
      if (!/^[+\d][\d\s-]{5,19}$/.test(phone)) {
        return res.status(400).json({
          success: false,
          message: '电话号码格式不正确，请输入有效的电话号码'
        });
      }
      
      // 工号格式和长度验证
      const staffId = staff.staff_id.trim();
      if (staffId.length < 2 || staffId.length > 20) {
        return res.status(400).json({
          success: false,
          message: '员工工号长度必须在2-20字符之间'
        });
      }
      
      if (!/^[A-Za-z0-9\-_]+$/.test(staffId)) {
        return res.status(400).json({
          success: false,
          message: '员工工号只能包含字母、数字、横线和下划线'
        });
      }
    }

    // 使用safeQuery进行安全的数据库操作
    try {
      // 批量检查工号唯一性（避免在事务中的多次查询）
      const staffIds = staffList.map(staff => staff.staff_id.trim());
      const existingStaff = await q(`
        SELECT staff_id FROM staff_presets 
        WHERE store_id = $1 AND staff_id = ANY($2)
      `, [storeId, staffIds]);

      if (existingStaff.rows.length > 0) {
        const duplicateIds = existingStaff.rows.map(row => row.staff_id).join(', ');
        throw new Error(`以下工号已在该门店存在: ${duplicateIds}`);
      }

      // 批量插入员工预设（使用ON CONFLICT处理并发冲突）
      const insertPromises = staffList.map(staff => 
        safeQuery(`
          INSERT INTO staff_presets (store_id, staff_id, name, phone, department, position, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW(), NOW())
          ON CONFLICT (store_id, staff_id) DO NOTHING
        `, [
          storeId,
          staff.staff_id.trim(),
          staff.name.trim(),
          staff.phone.trim(),
          staff.department?.trim() || null,
          staff.position?.trim() || null
        ])
      );

      await Promise.all(insertPromises);

      res.json({
        success: true,
        message: `成功添加 ${staffList.length} 名员工预设`
      });

    } catch (error) {
      console.error('批量添加员工预设错误:', error);
      
      // 精确的错误处理
      if (error.message.includes('已在该门店存在')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      throw error;
    }

  } catch (error) {
    console.error('添加员工预设错误:', error);
    res.status(500).json({
      success: false,
      message: error.message || '添加员工预设失败'
    });
  }
});

// 删除特定的员工预设
router.delete('/staff-presets/:presetId', adminAuth, async (req, res) => {
  try {
    const presetId = req.params.presetId;

    const result = await q(`
      DELETE FROM staff_presets
      WHERE id = $1
      RETURNING id, name, staff_id
    `, [presetId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '员工预设不存在'
      });
    }

    res.json({
      success: true,
      message: '员工预设删除成功'
    });

  } catch (error) {
    console.error('删除员工预设错误:', error);
    res.status(500).json({
      success: false,
      message: '删除员工预设失败'
    });
  }
});

// Rich Menu管理API
router.post('/rich-menu/initialize', adminAuth, async (req, res) => {
  try {
    const lineRichMenuService = require('../services/lineRichMenu');
    const result = await lineRichMenuService.initializeRichMenus();
    
    res.json({
      success: true,
      message: 'Rich Menu初始化成功',
      data: result
    });
  } catch (error) {
    console.error('Rich Menu初始化失败:', error);
    res.status(500).json({
      success: false,
      message: 'Rich Menu初始化失败'
    });
  }
});

router.post('/rich-menu/switch/:lineUserId', adminAuth, async (req, res) => {
  try {
    const { lineUserId } = req.params;
    const lineRichMenuService = require('../services/lineRichMenu');
    const result = await lineRichMenuService.checkAndSwitchMenu(lineUserId);
    
    res.json({
      success: true,
      message: result.message,
      data: {
        isStaff: result.isStaff,
        staffInfo: result.staffInfo,
        menuType: result.isStaff ? 'staff' : 'user'
      }
    });
  } catch (error) {
    console.error('菜单切换失败:', error);
    res.status(500).json({
      success: false,
      message: '菜单切换失败'
    });
  }
});

router.get('/rich-menu/list', adminAuth, async (req, res) => {
  try {
    const lineRichMenuService = require('../services/lineRichMenu');
    const menus = await lineRichMenuService.getRichMenuList();
    
    res.json({
      success: true,
      data: menus
    });
  } catch (error) {
    console.error('获取Rich Menu列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取Rich Menu列表失败'
    });
  }
});

// 员工绑定API - 通过工号验证身份并绑定LINE User ID (安全版本)
router.post('/staff-binding/verify', async (req, res) => {
  try {
    const { staff_id, store_code, id_token } = req.body;

    // 验证必填字段
    if (!staff_id || !id_token || !store_code) {
      return res.status(400).json({
        success: false,
        message: '工号、身份令牌和门店编码都是必填项'
      });
    }
    
    // 验证LINE ID Token
    let lineUserData;
    try {
      const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
      if (!channelId) {
        throw new Error('LINE Channel ID not configured');
      }
      lineUserData = await verifyLineIdToken(id_token, channelId);
    } catch (error) {
      console.error('ID token验证失败:', error.message);
      return res.status(401).json({
        success: false,
        message: '身份验证失败，请在LINE应用中重新打开'
      });
    }
    
    const { userId: line_user_id, displayName: display_name, phoneNumber: linePhoneNumber } = lineUserData;

    // 查找门店和员工预设（包含手机号）
    const presetResult = await q(`
      SELECT sp.id, sp.name, sp.staff_id, sp.phone, s.name as store_name
      FROM staff_presets sp
      JOIN stores s ON sp.store_id = s.id
      WHERE sp.staff_id = $1 AND s.code = $2 AND sp.status = 'active'
    `, [staff_id, store_code]);

    if (presetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '工号或门店编码不正确，请联系管理员确认'
      });
    }

    const preset = presetResult.rows[0];

    // 验证LINE绑定的手机号是否匹配预设手机号（关键安全验证）
    if (!preset.phone) {
      return res.status(400).json({
        success: false,
        message: '该员工未设置预留手机号，请联系管理员完善信息'
      });
    }

    if (!linePhoneNumber) {
      return res.status(400).json({
        success: false,
        message: '无法获取您的LINE绑定手机号，请确保LINE账号已绑定手机号并授权'
      });
    }

    // 标准化手机号格式进行比较（移除空格、连字符等）
    const normalizePhone = (phone) => {
      return phone.replace(/[\s\-\(\)]/g, '').replace(/^\+66/, '0').replace(/^\+86/, '');
    };

    const presetPhone = normalizePhone(preset.phone);
    const linePhone = normalizePhone(linePhoneNumber);

    if (presetPhone !== linePhone) {
      console.log(`❌ 手机号验证失败: 预设[${presetPhone}] vs LINE绑定[${linePhone}]`);
      return res.status(400).json({
        success: false,
        message: '您的LINE绑定手机号与预设信息不匹配，请联系管理员确认'
      });
    }

    console.log(`✅ 手机号验证通过: LINE绑定手机号[${linePhone}]与预设手机号匹配`);

    // 检查该员工是否已绑定
    const existingBinding = await q(`
      SELECT id FROM staff_bindings 
      WHERE preset_id = $1 AND binding_status = 'bound'
    `, [preset.id]);

    if (existingBinding.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该员工已绑定其他LINE账号'
      });
    }

    // 检查该LINE用户是否已绑定其他员工
    const existingUser = await q(`
      SELECT id FROM staff_bindings 
      WHERE line_user_id = $1 AND binding_status = 'bound'
    `, [line_user_id]);

    if (existingUser.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '您的LINE账号已绑定其他员工身份'
      });
    }

    // 创建或更新绑定记录
    await q(`
      INSERT INTO staff_bindings 
      (preset_id, line_user_id, display_name, binding_status, bound_at, created_at, updated_at)
      VALUES ($1, $2, $3, 'bound', NOW(), NOW(), NOW())
      ON CONFLICT (line_user_id) 
      DO UPDATE SET 
        preset_id = $1, 
        display_name = $3, 
        binding_status = 'bound',
        bound_at = NOW(),
        updated_at = NOW()
    `, [preset.id, line_user_id, display_name]);

    // 绑定成功后自动切换到员工菜单
    try {
      const lineRichMenuService = require('../services/lineRichMenu');
      await lineRichMenuService.setUserMenu(line_user_id, true);
      console.log(`✅ 员工 ${preset.name} 菜单已自动切换为员工工作台菜单`);
    } catch (menuError) {
      console.error('❌ 自动切换员工菜单失败:', menuError);
      // 菜单切换失败不影响绑定结果，只记录错误
    }

    res.json({
      success: true,
      message: `绑定成功！欢迎 ${preset.name}，您已获得 ${preset.store_name} 的核销权限。员工工作台菜单已为您激活！`,
      data: {
        staff_name: preset.name,
        store_name: preset.store_name,
        staff_id: preset.staff_id,
        menu_switched: true
      }
    });

  } catch (error) {
    console.error('员工绑定错误:', error);
    res.status(500).json({
      success: false,
      message: '绑定失败，请稍后重试'
    });
  }
});

// 检查LINE用户绑定状态 (需要ID token验证)
router.post('/staff-binding/status', async (req, res) => {
  try {
    const { id_token } = req.body;
    
    // 验证ID token并获取真实的LINE用户ID
    let lineUserData;
    try {
      const channelId = process.env.LINE_LOGIN_CHANNEL_ID;
      if (!channelId) {
        throw new Error('LINE Channel ID not configured');
      }
      lineUserData = await verifyLineIdToken(id_token, channelId);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: '身份验证失败'
      });
    }
    
    const lineUserId = lineUserData.userId;

    const result = await q(`
      SELECT sb.binding_status, sb.bound_at, sp.name, sp.staff_id, s.name as store_name, s.code as store_code
      FROM staff_bindings sb
      JOIN staff_presets sp ON sb.preset_id = sp.id
      JOIN stores s ON sp.store_id = s.id
      WHERE sb.line_user_id = $1 AND sb.binding_status = 'bound'
    `, [lineUserId]);

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: { is_bound: false }
      });
    }

    res.json({
      success: true,
      data: {
        is_bound: true,
        staff_info: result.rows[0]
      }
    });

  } catch (error) {
    console.error('查询绑定状态错误:', error);
    res.status(500).json({
      success: false,
      message: '查询绑定状态失败'
    });
  }
});

// 简单图片上传 - 使用对象存储
router.post('/upload/simple-image', async (req, res) => {
  try {
    const multer = require('multer');
    
    // 使用内存存储以便上传到对象存储
    const storage = multer.memoryStorage();

    const upload = multer({ 
      storage: storage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB限制
      fileFilter: (req, file, cb) => {
        console.log('📁 文件类型检查:', file.mimetype, file.originalname);
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        
        const hasValidMimeType = allowedTypes.includes(file.mimetype);
        const hasValidExtension = allowedExtensions.some(ext => 
          file.originalname.toLowerCase().endsWith(ext)
        );
        
        if (hasValidMimeType || hasValidExtension) {
          console.log('✅ 文件类型验证通过');
          cb(null, true);
        } else {
          console.log('❌ 文件类型验证失败:', file.mimetype, file.originalname);
          cb(new Error('只允许上传图片文件'));
        }
      }
    }).single('file');

    upload(req, res, async (uploadErr) => {
      if (uploadErr) {
        console.error('上传错误:', uploadErr);
        return res.status(400).json({
          success: false,
          message: uploadErr.message || '上传失败'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '没有上传文件'
        });
      }

      try {
        // 优先尝试对象存储
        const uploadResult = await objectStorageService.uploadFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          'admin/simple'
        );
        
        console.log('✅ 简单图片上传到对象存储成功:', uploadResult.objectPath);
        
        res.json({
          success: true,
          url: uploadResult.objectPath,
          data: { url: uploadResult.objectPath },
          message: '图片上传成功 (对象存储)'
        });
      } catch (storageError) {
        console.warn('⚠️ 对象存储上传失败，自动回退到本地存储:', storageError.message);
        
        try {
          // 回退方案：本地存储（允许所有环境）
          const fs = require('fs');
          const path = require('path');
          const uploadDir = path.join(__dirname, '../uploads/admin/simple');
          
          // 确保目录存在
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          // 生成文件名
          const { randomUUID } = require('crypto');
          const objectId = randomUUID();
          const extension = req.file.originalname.split('.').pop();
          const filename = `${objectId}.${extension}`;
          const filepath = path.join(uploadDir, filename);
          
          // 保存文件
          fs.writeFileSync(filepath, req.file.buffer);
          
          const fileUrl = `/uploads/admin/simple/${filename}`;
          console.log('✅ 简单图片回退到本地存储成功:', fileUrl);
          
          res.json({
            success: true,
            url: fileUrl,
            data: { url: fileUrl },
            message: '图片上传成功 (本地存储)'
          });
        } catch (localError) {
          console.error('❌ 本地存储也失败:', localError);
          res.status(500).json({
            success: false,
            message: '图片上传失败，请稍后重试'
          });
        }
      }
    });
  } catch (error) {
    console.error('上传图片错误:', error);
    res.status(500).json({
      success: false,
      message: '上传图片失败'
    });
  }
})

// 原来的图片上传API（需要认证）- 使用对象存储
router.post('/upload/image', adminAuth, async (req, res) => {
  try {
    const multer = require('multer');
    
    // 使用内存存储以便上传到对象存储
    const storage = multer.memoryStorage();

    const upload = multer({ 
      storage: storage,
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB限制
      },
      fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
          cb(null, true);
        } else {
          cb(new Error('只允许上传图片文件'));
        }
      }
    }).single('file');

    upload(req, res, async (uploadErr) => {
      if (uploadErr) {
        console.error('文件上传错误:', uploadErr);
        return res.status(400).json({
          success: false,
          message: uploadErr.message || '文件上传失败'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '未找到上传的文件'
        });
      }

      try {
        // 优先尝试对象存储
        const uploadResult = await objectStorageService.uploadFile(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype,
          'admin/authenticated'
        );

        console.log('✅ 认证图片上传到对象存储成功:', uploadResult.objectPath);

        res.json({
          success: true,
          data: {
            url: uploadResult.objectPath,
            filename: uploadResult.filename,
            size: req.file.size
          },
          message: '图片上传成功 (对象存储)'
        });
      } catch (storageError) {
        console.warn('⚠️ 对象存储失败，回退到本地存储:', storageError.message);
        
        try {
          // 回退方案：本地存储
          const fs = require('fs');
          const path = require('path');
          const uploadDir = path.join(__dirname, '../uploads/admin/authenticated');
          
          // 确保目录存在
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          
          // 生成文件名
          const { randomUUID } = require('crypto');
          const objectId = randomUUID();
          const extension = req.file.originalname.split('.').pop();
          const filename = `${objectId}.${extension}`;
          const filepath = path.join(uploadDir, filename);
          
          // 保存文件
          fs.writeFileSync(filepath, req.file.buffer);
          
          const fileUrl = `/uploads/admin/authenticated/${filename}`;
          console.log('✅ 认证图片回退到本地存储成功:', fileUrl);
          
          res.json({
            success: true,
            data: {
              url: fileUrl,
              filename: filename,
              size: req.file.size
            },
            message: '图片上传成功 (本地存储)'
          });
        } catch (localError) {
          console.error('❌ 本地存储也失败:', localError);
          res.status(500).json({
            success: false,
            message: '图片上传失败，请稍后重试'
          });
        }
      }
    });

  } catch (error) {
    console.error('上传图片错误:', error);
    res.status(500).json({
      success: false,
      message: '上传图片失败'
    });
  }
});

// 辅助函数：将相对URL转换为绝对URL
function toAbsoluteUrl(relativePath, req) {
  // 如果已经是绝对URL，直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  
  // 优先使用环境变量，否则使用Replit的后端域名
  // 注意：不能使用req.get('host')，因为它返回的是前端代理域名
  const baseUrl = process.env.PUBLIC_BASE_URL || 'https://prodee.replit.app';
  
  // 确保路径以/开头
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  
  const absoluteUrl = `${baseUrl}${path}`;
  console.log(`🔗 [toAbsoluteUrl] 相对路径: ${relativePath} -> 绝对URL: ${absoluteUrl}`);
  
  return absoluteUrl;
}

// 活动多媒体文件上传API (支持1-3张图片或视频) - 使用对象存储
router.post('/upload/campaign-media', adminAuth, async (req, res) => {
  console.log('📤 [UPLOAD] 收到campaign-media上传请求');
  console.log(`📤 [UPLOAD] Headers:`, req.headers['content-type']);
  console.log(`📤 [UPLOAD] 认证用户:`, req.admin ? '已认证' : '未认证');
  
  try {
    const multer = require('multer');
    
    // 使用内存存储以便上传到对象存储
    const storage = multer.memoryStorage();

    const upload = multer({ 
      storage: storage,
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB限制，防止内存耗尽
        files: 3, // 最多3个文件
        fieldSize: 1024 * 1024, // 1MB字段大小限制
        parts: 10 // 最多10个部分
      },
      fileFilter: (req, file, cb) => {
        // 严格验证文件类型，防止恶意文件上传
        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const videoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        
        // 检查MIME类型和文件扩展名
        const allowedTypes = [...imageTypes, ...videoTypes];
        const fileExt = file.originalname.toLowerCase().split('.').pop();
        const expectedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'ogg'];
        
        if (allowedTypes.includes(file.mimetype) && expectedExts.includes(fileExt)) {
          cb(null, true);
        } else {
          cb(new Error('只支持安全的图片(jpg,png,gif,webp)和视频(mp4,webm,ogg)格式'));
        }
      }
    }).array('files', 3); // 支持最多3个文件

    upload(req, res, async (err) => {
      if (err) {
        console.error('❌ [UPLOAD] Multer错误:', err.message);
        console.error('❌ [UPLOAD] 错误堆栈:', err.stack);
        return res.status(400).json({
          success: false,
          message: err.message || '文件上传失败'
        });
      }
      
      console.log(`📤 [UPLOAD] 文件接收成功，数量: ${req.files ? req.files.length : 0}`);

      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: '未找到上传的文件'
        });
      }

      // 服务器端验证：检查文件类型互斥和数量限制
      const fileTypes = req.files.map(file => file.mimetype.startsWith('image/') ? 'image' : 'video');
      const uniqueTypes = [...new Set(fileTypes)];
      
      // 检查类型互斥
      if (uniqueTypes.length > 1) {
        return res.status(400).json({
          success: false,
          message: '不能同时上传图片和视频'
        });
      }
      
      const fileType = uniqueTypes[0];
      
      // 检查数量限制
      if (fileType === 'video' && req.files.length > 1) {
        return res.status(400).json({
          success: false,
          message: '视频只能上传1个'
        });
      }
      
      if (fileType === 'image' && req.files.length > 3) {
        return res.status(400).json({
          success: false,
          message: '图片最多只能上传3张'
        });
      }

      try {
        console.log(`📤 [UPLOAD] 开始上传到对象存储...`);
        
        // 上传文件到对象存储
        const uploadPromises = req.files.map(async (file) => {
          const isImage = file.mimetype.startsWith('image/');
          const folder = isImage ? 'campaigns/images' : 'campaigns/videos';
          
          console.log(`📤 [UPLOAD] 上传文件: ${file.originalname}, 类型: ${file.mimetype}, 大小: ${file.size}`);
          
          const result = await objectStorageService.uploadFile(
            file.buffer,
            file.originalname,
            file.mimetype,
            folder
          );
          
          console.log(`✅ [UPLOAD] 文件上传成功: ${result.objectPath}`);
          
          // 转换为前端兼容路径（不包含/api前缀，前端会自动添加）
          const relativePath = result.objectPath.replace('/objects/', '/uploads/');
          
          console.log(`🔗 [UPLOAD] 对象路径: ${result.objectPath}`);
          console.log(`🔗 [UPLOAD] 相对路径: ${relativePath}`);
          
          return {
            type: isImage ? 'image' : 'video',
            url: relativePath, // 返回相对路径，前端会自动添加/api前缀
            filename: result.filename,
            originalName: result.originalName,
            size: file.size,
            mimetype: result.mimetype,
            objectId: result.objectId
          };
        });

        const uploadedFiles = await Promise.all(uploadPromises);
        
        console.log(`✅ [UPLOAD] 成功上传${uploadedFiles.length}个文件到对象存储`);

        res.json({
          success: true,
          data: {
            files: uploadedFiles,
            count: uploadedFiles.length
          },
          message: `成功上传${uploadedFiles.length}个文件到对象存储`
        });
        
      } catch (storageError) {
        console.warn('⚠️ [UPLOAD] 对象存储上传失败，自动回退到本地存储:', storageError.message);
        
        try {
          const fs = require('fs');
          const path = require('path');
          const { randomUUID } = require('crypto');
          
          const uploadedFiles = await Promise.all(req.files.map(async (file) => {
            const isImage = file.mimetype.startsWith('image/');
            const folder = isImage ? 'campaigns/images' : 'campaigns/videos';
            const uploadDir = path.join(__dirname, '../uploads', folder);
            
            // 确保目录存在
            if (!fs.existsSync(uploadDir)) {
              fs.mkdirSync(uploadDir, { recursive: true });
            }
            
            // 生成文件名
            const objectId = randomUUID();
            const extension = file.originalname.split('.').pop();
            const filename = `${objectId}.${extension}`;
            const filepath = path.join(uploadDir, filename);
            
            // 保存文件
            fs.writeFileSync(filepath, file.buffer);
            
            const relativeUrl = `/uploads/${folder}/${filename}`;
            const absoluteUrl = toAbsoluteUrl(relativeUrl, req);
            
            console.log(`🔗 [LOCAL FALLBACK] 相对路径: ${relativeUrl}`);
            console.log(`🔗 [LOCAL FALLBACK] 绝对URL: ${absoluteUrl}`);
            
            return {
              type: isImage ? 'image' : 'video',
              url: absoluteUrl, // 返回绝对URL
              filename: filename,
              originalName: file.originalname,
              size: file.size,
              mimetype: file.mimetype,
              objectId: objectId
            };
          }));
          
          console.log(`✅ [UPLOAD] 成功上传${uploadedFiles.length}个文件到本地存储 (自动回退)`);

          res.json({
            success: true,
            data: {
              files: uploadedFiles,
              count: uploadedFiles.length
            },
            message: `成功上传${uploadedFiles.length}个文件 (本地存储)`
          });
          
        } catch (localError) {
          console.error('❌ 本地存储也失败:', localError);
          res.status(500).json({
            success: false,
            message: '文件上传失败，请稍后重试'
          });
        }
      }
    });

  } catch (error) {
    console.error('上传多媒体文件错误:', error);
    res.status(500).json({
      success: false,
      message: '上传多媒体文件失败'
    });
  }
});

// 生成员工绑定二维码
router.get('/stores/:storeId/binding-qr', adminAuth, async (req, res) => {
  try {
    const storeId = parseInt(req.params.storeId);
    
    // 验证门店ID
    if (!storeId || isNaN(storeId)) {
      return res.status(400).json({
        success: false,
        message: '无效的门店ID'
      });
    }

    // 获取门店信息
    const storeResult = await q(
      'SELECT id, name, code FROM stores WHERE id = $1 AND status = $2',
      [storeId, 'active']
    );

    if (storeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '门店不存在或已停用'
      });
    }

    const store = storeResult.rows[0];
    
    // 生成绑定URL - 指向员工绑定页面
    // 使用Replit公开域名，Express服务器会提供构建后的前端代码
    const baseUrl = process.env.REPLIT_DOMAINS 
      ? `https://${process.env.REPLIT_DOMAINS}`
      : (process.env.NODE_ENV === 'production' 
        ? `https://prodee.replit.app`
        : `https://86278876-4363-422e-9f1c-caaa2a1a65fe-00-3lm5gxzb82hih.spock.replit.dev`);
    
    const bindingUrl = `${baseUrl}/staff-binding?store=${store.code}`;
    
    // 生成二维码
    const qrCodeDataUrl = await QRCode.toDataURL(bindingUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    res.json({
      success: true,
      data: {
        qrCodeUrl: qrCodeDataUrl,
        bindingUrl: bindingUrl,
        storeInfo: {
          id: store.id,
          name: store.name,
          code: store.code
        }
      }
    });

  } catch (error) {
    console.error('生成员工绑定二维码失败:', error);
    res.status(500).json({
      success: false,
      message: '生成二维码失败'
    });
  }
});

// ========== 员工KPI统计API ==========

// 获取员工KPI统计（超级管理员查看所有，员工查看自己）
router.get('/staff-kpi', adminAuth, requireContentAccess, async (req, res) => {
  try {
    const { start_date, end_date, staff_id } = req.query;
    const isSuperAdmin = req.admin.role === 'super_admin';
    
    // 如果不是超级管理员，只能查看自己的数据
    const targetStaffId = isSuperAdmin && staff_id ? staff_id : req.admin.id;

    // 构建时间筛选条件
    let dateFilter = '';
    const queryParams = [targetStaffId];
    
    if (start_date && end_date) {
      dateFilter = ' AND p.created_at BETWEEN $2 AND $3';
      queryParams.push(start_date, end_date);
    }

    // 统计数据：发布数、总点赞、总评论、粉丝数
    const statsQuery = `
      SELECT 
        a.id,
        a.display_name,
        a.avatar,
        a.department,
        COUNT(DISTINCT p.id) as post_count,
        COALESCE(SUM(p.likes_count), 0) as total_likes,
        COALESCE(SUM(p.comments_count), 0) as total_comments,
        (SELECT COUNT(*) FROM follows WHERE followed_id = a.id) as follower_count
      FROM admins a
      LEFT JOIN posts p ON p.author_id = a.id ${dateFilter}
      WHERE a.id = $1 AND a.role = 'content_operator'
      GROUP BY a.id, a.display_name, a.avatar, a.department
    `;

    const result = await q(statsQuery, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到员工数据'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('获取员工KPI统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取员工KPI统计失败'
    });
  }
});

// 获取所有员工KPI排行榜（仅超级管理员）
router.get('/staff-kpi/leaderboard', adminAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { start_date, end_date, sort_by = 'post_count', limit = 10 } = req.query;

    // 构建时间筛选条件
    let dateFilter = '';
    const queryParams = [];
    
    if (start_date && end_date) {
      dateFilter = ' AND p.created_at BETWEEN $1 AND $2';
      queryParams.push(start_date, end_date);
    }

    // 验证排序字段
    const allowedSortFields = ['post_count', 'total_likes', 'total_comments', 'follower_count'];
    const sortField = allowedSortFields.includes(sort_by) ? sort_by : 'post_count';

    const leaderboardQuery = `
      SELECT 
        a.id,
        a.display_name,
        a.avatar,
        a.department,
        COUNT(DISTINCT p.id) as post_count,
        COALESCE(SUM(p.likes_count), 0) as total_likes,
        COALESCE(SUM(p.comments_count), 0) as total_comments,
        (SELECT COUNT(*) FROM follows WHERE followed_id = a.id) as follower_count
      FROM admins a
      LEFT JOIN posts p ON p.author_id = a.id ${dateFilter}
      WHERE a.role = 'content_operator' AND a.is_active = true
      GROUP BY a.id, a.display_name, a.avatar, a.department
      ORDER BY ${sortField} DESC
      LIMIT $${queryParams.length + 1}
    `;

    queryParams.push(parseInt(limit) || 10);
    const result = await q(leaderboardQuery, queryParams);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取员工KPI排行榜失败:', error);
    res.status(500).json({
      success: false,
      message: '获取员工KPI排行榜失败'
    });
  }
});

// ========== 账号管理API（仅超级管理员） ==========

// 获取员工账号列表
router.get('/accounts', adminAuth, requireSuperAdmin, async (req, res) => {
  try {
    const result = await q(
      `SELECT id, email, name, role, display_name, avatar, department, is_active, 
              created_by, created_at, updated_at
       FROM admins
       WHERE role = 'content_operator'
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('获取员工账号列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取员工账号列表失败'
    });
  }
});

// 创建员工账号
router.post('/accounts', adminAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { email, password, display_name, avatar, department } = req.body;

    if (!email || !password || !display_name) {
      return res.status(400).json({
        success: false,
        message: '邮箱、密码和显示名称不能为空'
      });
    }

    // 检查邮箱是否已存在
    const checkResult = await q(
      'SELECT id FROM admins WHERE email = $1',
      [email]
    );

    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该邮箱已被使用'
      });
    }

    // 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入新账号
    const result = await q(
      `INSERT INTO admins (email, password, name, role, display_name, avatar, department, is_active, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING id, email, name, role, display_name, avatar, department, is_active, created_at`,
      [email, hashedPassword, display_name, 'content_operator', display_name, avatar || null, department || null, true, req.admin.id]
    );

    res.json({
      success: true,
      message: '员工账号创建成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('创建员工账号失败:', error);
    res.status(500).json({
      success: false,
      message: '创建员工账号失败'
    });
  }
});

// 编辑员工账号
router.put('/accounts/:id', adminAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { display_name, avatar, department, is_active } = req.body;

    if (!display_name) {
      return res.status(400).json({
        success: false,
        message: '显示名称不能为空'
      });
    }

    const result = await q(
      `UPDATE admins
       SET display_name = $1, avatar = $2, department = $3, is_active = $4, updated_at = NOW()
       WHERE id = $5 AND role = 'content_operator'
       RETURNING id, email, name, role, display_name, avatar, department, is_active, updated_at`,
      [display_name, avatar || null, department || null, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '员工账号不存在'
      });
    }

    res.json({
      success: true,
      message: '员工账号更新成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('更新员工账号失败:', error);
    res.status(500).json({
      success: false,
      message: '更新员工账号失败'
    });
  }
});

// 删除员工账号
router.delete('/accounts/:id', adminAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await q(
      'DELETE FROM admins WHERE id = $1 AND role = $2 RETURNING id',
      [id, 'content_operator']
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '员工账号不存在'
      });
    }

    res.json({
      success: true,
      message: '员工账号删除成功'
    });
  } catch (error) {
    console.error('删除员工账号失败:', error);
    res.status(500).json({
      success: false,
      message: '删除员工账号失败'
    });
  }
});

// 重置员工密码
router.post('/accounts/:id/reset-password', adminAuth, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: '新密码长度不能少于8位'
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const result = await q(
      `UPDATE admins
       SET password = $1, updated_at = NOW()
       WHERE id = $2 AND role = 'content_operator'
       RETURNING id, email`,
      [hashedPassword, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '员工账号不存在'
      });
    }

    res.json({
      success: true,
      message: '密码重置成功'
    });
  } catch (error) {
    console.error('重置密码失败:', error);
    res.status(500).json({
      success: false,
      message: '重置密码失败'
    });
  }
});

// 评论管理
// 获取评论列表
router.get('/comments', adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, keyword, status, post_id } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    // 关键词搜索
    if (keyword) {
      whereConditions.push(`(pc.content ILIKE $${paramIndex} OR u.nickname ILIKE $${paramIndex})`);
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    // 状态筛选
    if (status) {
      whereConditions.push(`pc.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    // 内容筛选
    if (post_id) {
      whereConditions.push(`pc.post_id = $${paramIndex}`);
      params.push(post_id);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // 查询评论列表
    const result = await q(
      `SELECT 
        pc.id,
        pc.content,
        pc.status,
        pc.created_at,
        pc.post_id,
        p.title as post_title,
        u.id as user_id,
        u.nickname as user_nickname,
        u.avatar as user_avatar
      FROM post_comments pc
      LEFT JOIN posts p ON pc.post_id = p.id
      LEFT JOIN users u ON pc.user_id = u.id
      ${whereClause}
      ORDER BY pc.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, parseInt(limit), offset]
    );

    // 查询总数
    const countResult = await q(
      `SELECT COUNT(*) as total
      FROM post_comments pc
      LEFT JOIN users u ON pc.user_id = u.id
      ${whereClause}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].total),
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('获取评论列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取评论列表失败'
    });
  }
});

// 审核通过评论
router.put('/comments/:id/approve', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await q(
      `UPDATE post_comments
       SET status = 'approved', updated_at = NOW()
       WHERE id = $1
       RETURNING id, content, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }

    res.json({
      success: true,
      message: '评论已通过审核',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('审核评论失败:', error);
    res.status(500).json({
      success: false,
      message: '审核评论失败'
    });
  }
});

// 拒绝评论
router.put('/comments/:id/reject', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await q(
      `UPDATE post_comments
       SET status = 'rejected', updated_at = NOW()
       WHERE id = $1
       RETURNING id, content, status`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }

    res.json({
      success: true,
      message: '评论已拒绝',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('拒绝评论失败:', error);
    res.status(500).json({
      success: false,
      message: '拒绝评论失败'
    });
  }
});

// 删除评论
router.delete('/comments/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await q(
      'DELETE FROM post_comments WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '评论不存在'
      });
    }

    res.json({
      success: true,
      message: '评论已删除'
    });
  } catch (error) {
    console.error('删除评论失败:', error);
    res.status(500).json({
      success: false,
      message: '删除评论失败'
    });
  }
});

// ==================== 仪表盘统计 API ====================

// 获取仪表盘核心统计数据
router.get('/dashboard/stats', adminAuth, async (req, res) => {
  try {
    // 1. 获取用户总数
    const usersResult = await q(`
      SELECT COUNT(*) as total
      FROM users
      WHERE deleted_at IS NULL
    `);
    const totalUsers = parseInt(usersResult.rows[0].total);

    // 2. 获取订单总数和总收入（积分商城）
    const ordersResult = await q(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(CASE 
          WHEN cash_paid IS NOT NULL AND cash_paid > 0 THEN cash_paid
          ELSE 0
        END), 0) as total_revenue
      FROM reward_redemptions
      WHERE status IN ('pending', 'processing', 'completed')
    `);
    const totalOrders = parseInt(ordersResult.rows[0].total_orders);
    const totalRevenue = parseFloat(ordersResult.rows[0].total_revenue);

    // 3. 获取优惠券总数
    const couponsResult = await q(`
      SELECT COUNT(*) as total
      FROM campaigns
      WHERE deleted_at IS NULL
    `);
    const totalCoupons = parseInt(couponsResult.rows[0].total);

    // 4. 获取门店总数
    const storesResult = await q(`
      SELECT COUNT(*) as total
      FROM stores
      WHERE status = 'active'
    `);
    const totalStores = parseInt(storesResult.rows[0].total);

    // 5. 获取核销总数
    const redemptionsResult = await q(`
      SELECT COUNT(*) as total
      FROM user_coupons
      WHERE redeemed_at IS NOT NULL
    `);
    const totalRedemptions = parseInt(redemptionsResult.rows[0].total);

    // 6. 计算转化率（订单数 / 用户数）
    const conversionRate = totalUsers > 0 ? ((totalOrders / totalUsers) * 100).toFixed(2) : 0;

    res.json({
      success: true,
      data: {
        totalRevenue: totalRevenue,
        totalOrders: totalOrders,
        totalUsers: totalUsers,
        conversionRate: parseFloat(conversionRate),
        totalCoupons: totalCoupons,
        totalStores: totalStores,
        totalRedemptions: totalRedemptions
      }
    });
  } catch (error) {
    console.error('获取仪表盘统计数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
});

// 获取销售趋势数据
router.get('/dashboard/sales-trend', adminAuth, async (req, res) => {
  try {
    const { period = '30' } = req.query; // 默认30天
    const days = parseInt(period);

    const result = await q(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as order_count,
        COALESCE(SUM(CASE 
          WHEN cash_paid IS NOT NULL AND cash_paid > 0 THEN cash_paid
          ELSE 0
        END), 0) as revenue
      FROM reward_redemptions
      WHERE created_at >= NOW() - INTERVAL '${days} days'
        AND status IN ('pending', 'processing', 'completed')
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    const data = result.rows.map(row => ({
      date: row.date,
      orderCount: parseInt(row.order_count),
      revenue: parseFloat(row.revenue)
    }));

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('获取销售趋势数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取销售趋势失败',
      error: error.message
    });
  }
});

// 获取优惠券分布数据
router.get('/dashboard/coupon-distribution', adminAuth, async (req, res) => {
  try {
    const result = await q(`
      SELECT 
        CASE 
          WHEN type = 'discount' THEN '折扣券'
          WHEN type = 'voucher' THEN '抵用券'
          WHEN type = 'gift' THEN '赠品券'
          ELSE '其他'
        END as coupon_type,
        COUNT(*) as count
      FROM campaigns
      WHERE deleted_at IS NULL
      GROUP BY type
      ORDER BY count DESC
    `);

    const data = result.rows.map(row => ({
      name: row.coupon_type,
      value: parseInt(row.count)
    }));

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('获取优惠券分布数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取优惠券分布失败',
      error: error.message
    });
  }
});

module.exports = router;