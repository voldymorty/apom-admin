// app/routes/AppRoutes.jsx
// Next.js uses file-based routing. This module centralizes route paths
// for guards and navigation without relying on react-router-dom.

export const ROUTES = Object.freeze({
  login: "/login",
  dashboard: "/dashboard",
  farmerManagement: "/farmer-management",
  vendorManagement: "/vendor-management",
  deliveryManagement: "/delivery-management",
  productManagement: "/product-management",
  orderManagement: "/order-management",
  pickupsdeliveriesManagement: "/pickups-deliveries-management",
  notifications: "/notifications",
  admins: "/admins",
});

export const PUBLIC_ROUTES = Object.freeze([ROUTES.login]);

export const PROTECTED_ROUTES = Object.freeze([
  ROUTES.dashboard,
  ROUTES.farmerManagement,
  ROUTES.vendorManagement,
  ROUTES.deliveryManagement,
  ROUTES.productManagement,
  ROUTES.orderManagement,
  ROUTES.pickupsdeliveriesManagement,
  ROUTES.notifications,
  ROUTES.admins,
]);

export const DEFAULT_PUBLIC_REDIRECT = ROUTES.login;
export const DEFAULT_AUTH_REDIRECT = ROUTES.dashboard;

const AppRoutes = {
  ROUTES,
  PUBLIC_ROUTES,
  PROTECTED_ROUTES,
  DEFAULT_PUBLIC_REDIRECT,
  DEFAULT_AUTH_REDIRECT,
};

export default AppRoutes;
