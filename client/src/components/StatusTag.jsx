import React from 'react';
import { Tag } from 'antd';

const statusConfig = {
  '草稿':   { color: 'default', label: '草稿' },
  '待审批': { color: 'blue',    label: '待审批' },
  '已批准': { color: 'green',   label: '已批准' },
  '已驳回': { color: 'red',     label: '已驳回' },
  '制作中': { color: 'orange',  label: '制作中' },
  '已完成': { color: 'cyan',    label: '已完成' },
  '已签收': { color: 'purple',  label: '已签收' },
  '已发货': { color: 'purple', label: '已发货' },};

const urgencyConfig = {
  '普通': { color: 'blue', label: '普通' },
  '紧急': { color: 'orange', label: '紧急' },
  '特急': { color: 'red', label: '特急' },
};

export function StatusTag({ status, style }) {
  const cfg = statusConfig[status] || { color: 'default', label: status };
  return <Tag color={cfg.color} style={style}>{cfg.label}</Tag>;
}

export function UrgencyTag({ urgency, style }) {
  const cfg = urgencyConfig[urgency] || { color: 'blue', label: urgency };
  return <Tag color={cfg.color} style={style}>{cfg.label}</Tag>;
}

export { statusConfig };
