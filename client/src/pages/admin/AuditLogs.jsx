import React, { useState, useEffect } from 'react';
import { Table, Tag } from 'antd';
import { getAuditLogs } from '../../api';
import dayjs from 'dayjs';

export default function AuditLogs() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getAuditLogs({ page, pageSize: 50 });
      setData(res.list);
      setTotal(res.total);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [page]);

  const columns = [
    { title: '时间', dataIndex: 'created_at', width: 160, render: t => dayjs(t).format('YYYY-MM-DD HH:mm:ss') },
    { title: '操作人', dataIndex: 'user_name', width: 100 },
    { title: '操作', dataIndex: 'action', width: 120 },
    { title: '对象类型', dataIndex: 'entity_type', width: 120 },
    { title: '对象ID', dataIndex: 'entity_id', width: 80 },
    { title: '变更前', dataIndex: 'old_value', ellipsis: true },
    { title: '变更后', dataIndex: 'new_value', ellipsis: true },
  ];

  return (
    <div>
      <div className="page-header"><h2>审计日志</h2></div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={loading}
        pagination={{ current: page, total, pageSize: 50, onChange: setPage, showTotal: t => `共 ${t} 条` }}
      />
    </div>
  );
}
