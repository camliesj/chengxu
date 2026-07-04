DELETE FROM repair_orders;

INSERT INTO repair_orders (
  id, date, time, plate, customer, phone, car, insurer, type, status,
  labor, material, amount, record, staff, delivery, vin, claim_no,
  accident_type, payment_method, remark, settlement_date, settlement_time, settlement_remark
) VALUES
(
  'RO20260704001', '07-04', '09:18', '粤B·K7M26', '林先生', '136****4821',
  '丰田 凯美瑞', '平安保险', '标的车', '在修中',
  280, 620, 900, '前保险杠喷漆，左前大灯检测', '张工', '07-04 17:30',
  'LVGBM74K8PG****26', 'PA20260704001', '保险维修', '待确认',
  '客户要求完工后电话通知验车。', '', '', ''
),
(
  'RO20260704002', '07-04', '10:42', '粤A·Q3N58', '周女士', '139****7056',
  '大众 迈腾', '人保财险', '三者车', '待结算',
  160, 340, 500, '更换右后尾灯，后杠抛光', '王工', '07-04 15:00',
  'LFV3A23C4N3****58', 'PIC20260704002', '小事故', '待确认',
  '保险资料已拍照归档，等待客户确认结算。', '', '', ''
);
