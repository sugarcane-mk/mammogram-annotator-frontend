import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../store/store';
import type { UserRole } from '../db/database';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRoles?: UserRole[];
  fallbackPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRoles,
  fallbackPath = '/login'
}) => {
  const { authUser, authRole } = useAppStore();

  const getRoleHomePath = (role: UserRole) => {
    if (role === 'admin') return '/admin';
    if (role === 'hospital') return '/hospital';
    return '/dashboard';
  };

  if (!authUser || !authRole) {
    return <Navigate to={fallbackPath} replace />;
  }

  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(authRole)) {
    return <Navigate to={getRoleHomePath(authRole)} replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
