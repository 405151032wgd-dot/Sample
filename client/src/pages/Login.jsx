import React, { useState } from 'react';
import { Form, Input, Button, Card, message, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginUser, user } = useAuth();

  if (user) { navigate('/dashboard'); return null; }

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const data = await login(values.email, values.password);
      loginUser(data.token, data.user);
      message.success('登录成功');
      navigate('/dashboard');
    } catch (err) {
      message.error(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      <Card style={{ width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={3} style={{ margin: 0 }}>试样样品申请系统</Title>
          <Text type="secondary">请登录以继续</Text>
        </div>
        <Form layout="vertical" onFinish={onFinish} autoComplete="off">
          <Form.Item name="email" rules={[{ required: true, message: '请输入邮箱' }]}>
            <Input prefix={<UserOutlined />} placeholder="邮箱" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block size="large">登 录</Button>
          </Form.Item>
        </Form>
        <div style={{ fontSize: 12, color: '#999', textAlign: 'center' }}>
          <p>测试账号：admin@company.com / 123456</p>
          <p>审批人：wang@company.com / 123456</p>
          <p>申请人：zhang@company.com / 123456</p>
        </div>
      </Card>
    </div>
  );
}
