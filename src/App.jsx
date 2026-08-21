import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes, useParams } from "react-router-dom";
import { LoadingState } from "./design-system";
import { routeManifest } from "./config/navigationConfig";
import { hasNavigationScope } from "./data/products/taxonomy";
import { AuthProvider } from "./context/AuthContext";
import { AccountProvider } from "./context/AccountContext";
import { ShoppingProvider } from "./context/ShoppingContext";
import { InventoryProvider } from "./context/InventoryContext";
import { CheckoutProvider } from "./context/CheckoutContext";
import { OrderProvider } from "./context/OrderContext";
import { EmployeeAuthProvider } from "./context/EmployeeAuthContext";
import { EmployeeManagementProvider } from "./context/EmployeeManagementContext";
import { AdminAuthProvider } from "./context/AdminAuthContext";
import { WorkforceProvider } from "./context/WorkforceContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import EmployeeProtectedRoute from "./components/employee/EmployeeProtectedRoute";
import AdminProtectedRoute from "./components/admin/AdminProtectedRoute";
import AdminEmployeeManagementRoute from "./components/admin/AdminEmployeeManagementRoute";
import CustomerLayout from "./layouts/CustomerLayout";
import EmployeeLayout from "./layouts/EmployeeLayout";
import AdminLayout from "./layouts/AdminLayout";
import AtelierDesign from "./pages/AtelierDesign";
import CatalogueListing from "./pages/CatalogueListing";
import CategoryPage from "./pages/CategoryPage";
import Explore from "./pages/Explore";
import NotFound from "./pages/NotFound";
import SearchResults from "./pages/SearchResults";
import Shop from "./pages/Shop";

const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderSuccess = lazy(() => import("./pages/OrderSuccess"));

const SignIn = lazy(() => import("./pages/auth/SignIn"));
const SignUp = lazy(() => import("./pages/auth/SignUp"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

const AccountDashboard = lazy(() => import("./pages/account/AccountDashboard"));
const AccountProfile = lazy(() => import("./pages/account/AccountProfile"));
const AccountAddresses = lazy(() => import("./pages/account/AccountAddresses"));
const AccountOrders = lazy(() => import("./pages/account/AccountOrders"));
const OrderDetail = lazy(() => import("./pages/account/OrderDetail"));
const OrderTracking = lazy(() => import("./pages/account/OrderTracking"));
const OrderReturn = lazy(() => import("./pages/account/OrderReturn"));
const AccountSettings = lazy(() => import("./pages/account/AccountSettings"));
const AccountSecurity = lazy(() => import("./pages/account/AccountSecurity"));
const AccountPreferences = lazy(() => import("./pages/account/AccountPreferences"));
const AiMirror = lazy(() => import("./pages/account/AiMirror"));
const AiShoppingAssistant = lazy(() => import("./pages/account/AiShoppingAssistant"));

const EmployeeLogin = lazy(() => import("./pages/employee/EmployeeLogin"));
const EmployeeForgotPassword = lazy(() => import("./pages/employee/EmployeeForgotPassword"));
const EmployeeChangePassword = lazy(() => import("./pages/employee/EmployeeChangePassword"));
const EmployeeDashboard = lazy(() => import("./pages/employee/EmployeeDashboard"));
const EmployeeProfile = lazy(() => import("./pages/employee/EmployeeProfile"));
const EmployeeAttendance = lazy(() => import("./pages/employee/EmployeeAttendance"));
const EmployeeLeave = lazy(() => import("./pages/employee/EmployeeLeave"));
const EmployeePerformance = lazy(() => import("./pages/employee/EmployeePerformance"));
const EmployeeProducts = lazy(() => import("./pages/employee/EmployeeProducts"));
const EmployeeProductForm = lazy(() => import("./pages/employee/EmployeeProductForm"));
const EmployeeProductReview = lazy(() => import("./pages/employee/EmployeeProductReview"));
const EmployeeCustomers = lazy(() => import("./pages/employee/EmployeeCustomers"));
const EmployeeOrders = lazy(() => import("./pages/employee/EmployeeOrders"));
const EmployeeOrderDetail = lazy(() => import("./pages/employee/EmployeeOrderDetail"));
const EmployeeAssistedOrder = lazy(() => import("./pages/employee/EmployeeAssistedOrder"));
const EmployeeOffers = lazy(() => import("./pages/employee/EmployeeOffers"));
const EmployeeOfferForm = lazy(() => import("./pages/employee/EmployeeOfferForm"));
const EmployeeOfferDetail = lazy(() => import("./pages/employee/EmployeeOfferDetail"));
const EmployeeAccessDenied = lazy(() => import("./pages/employee/EmployeeAccessDenied"));
const EmployeeDesk = lazy(() => import("./pages/employee/EmployeeDesk"));
const EmployeeReports = lazy(() => import("./pages/employee/EmployeeReports"));
const EmployeeMediaDashboard = lazy(() => import("./pages/employee/EmployeeMediaDashboard"));
const EmployeeMediaUpload = lazy(() => import("./pages/employee/EmployeeMediaUpload"));
const EmployeeMediaDetail = lazy(() => import("./pages/employee/EmployeeMediaDetail"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminActivity = lazy(() => import("./pages/admin/AdminActivity"));
const AdminEmployees = lazy(() => import("./pages/admin/employees/AdminEmployees"));
const AdminEmployeeCreate = lazy(() => import("./pages/admin/employees/AdminEmployeeCreate"));
const AdminEmployeeDetail = lazy(() => import("./pages/admin/employees/AdminEmployeeDetail"));
const AdminEmployeeEdit = lazy(() => import("./pages/admin/employees/AdminEmployeeEdit"));
const AdminProfile = lazy(() => import("./pages/admin/AdminProfile"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const ProductForm = lazy(() => import("./pages/admin/ProductForm"));
const AdminProductDetail = lazy(() => import("./pages/admin/AdminProductDetail"));
const AdminProductReview = lazy(() => import("./pages/admin/AdminProductReview"));
const AdminMediaLibrary = lazy(() => import("./pages/admin/media/AdminMediaLibrary"));
const AdminMediaUpload = lazy(() => import("./pages/admin/media/AdminMediaUpload"));
const AdminMediaReview = lazy(() => import("./pages/admin/media/AdminMediaReview"));
const AdminMarketingMedia = lazy(() => import("./pages/admin/media/AdminMarketingMedia"));
const AdminMediaDetail = lazy(() => import("./pages/admin/media/AdminMediaDetail"));
const AdminProductMedia = lazy(() => import("./pages/admin/media/AdminProductMedia"));
const AdminMediaProductMapping = lazy(() => import("./pages/admin/media/AdminMediaProductMapping"));
const InventoryDashboardPage = lazy(() => import("./components/inventory/InventoryDashboardPage"));
const InventoryOperationPage = lazy(() => import("./components/inventory/InventoryOperationPage"));
const InventoryTransfersPage = lazy(() => import("./components/inventory/InventoryTransfersPage"));
const InventoryMovementsPage = lazy(() => import("./components/inventory/InventoryMovementsPage"));
const InventoryLowStockPage = lazy(() => import("./components/inventory/InventoryLowStockPage"));
const AdminOrders = lazy(() => import("./pages/admin/orders/AdminOrders"));
const AdminOrderDetail = lazy(() => import("./pages/admin/orders/AdminOrderDetail"));
const AdminOrderInvoice = lazy(() => import("./pages/admin/orders/AdminOrderInvoice"));
const AdminNotFound = lazy(() => import("./pages/admin/AdminNotFound"));
const AdminCustomers = lazy(() => import("./pages/admin/AdminCustomers"));
const AdminCustomerDetail = lazy(() => import("./pages/admin/AdminCustomerDetail"));
const AdminReturns = lazy(() => import("./pages/admin/AdminReturns"));
const AdminReturnDetail = lazy(() => import("./pages/admin/AdminReturnDetail"));
const AdminOffers = lazy(() => import("./pages/admin/offers/AdminOffers"));
const AdminOfferFormPage = lazy(() => import("./pages/admin/offers/AdminOfferFormPage"));
const AdminOfferDetail = lazy(() => import("./pages/admin/offers/AdminOfferDetail"));
const AdminCategories = lazy(() => import("./pages/admin/taxonomy/AdminCategories"));
const AdminCategoryForm = lazy(() => import("./pages/admin/taxonomy/AdminCategoryForm"));
const AdminCategoryDetail = lazy(() => import("./pages/admin/taxonomy/AdminCategoryDetail"));
const AdminCollections = lazy(() => import("./pages/admin/taxonomy/AdminCollections"));
const AdminCollectionForm = lazy(() => import("./pages/admin/taxonomy/AdminCollectionForm"));
const AdminCollectionDetail = lazy(() => import("./pages/admin/taxonomy/AdminCollectionDetail"));
const AdminAnalytics = lazy(() => import("./pages/admin/analytics/AdminAnalytics"));
const AiBusinessAssistant = lazy(() => import("./pages/admin/AiBusinessAssistant"));

const dedicatedPaths = new Set([
  "/explore",
  "/search",
  "/cart",
  "/wishlist",
  "/checkout",
  "/order-success",
  "/account",
  "/account/profile",
  "/account/addresses",
  "/account/orders",
  "/account/settings",
  "/account/security",
  "/account/preferences",
  "/account/ai-mirror",
  "/account/ai-shopping",
  "/account/wishlist",
  "/signin",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

function LegacyCollectionRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/collections/${slug}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AccountProvider>
          <InventoryProvider>
            <ShoppingProvider>
              <OrderProvider>
                <CheckoutProvider>
                  <EmployeeAuthProvider>
                    <AdminAuthProvider>
                      <EmployeeManagementProvider>
                    <WorkforceProvider>
                    <Suspense fallback={<LoadingState label="Opening PRATIKSHYA FASHON" />}>
                    <Routes>
                      <Route path="/admin/login" element={<AdminLogin />} />

                      <Route element={<AdminProtectedRoute />}>
                        <Route element={<AdminLayout />}>
                          <Route path="/admin" element={<AdminDashboard />} />
                          <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />

                          <Route element={<AdminEmployeeManagementRoute />}>
                            <Route path="/admin/employees" element={<AdminEmployees />} />
                            <Route path="/admin/employees/new" element={<AdminEmployeeCreate />} />
                            <Route path="/admin/employees/:employeeId/edit" element={<AdminEmployeeEdit />} />
                            <Route path="/admin/employees/:employeeId" element={<AdminEmployeeDetail />} />
                          </Route>

                          <Route path="/admin/activity" element={<AdminActivity />} />
                          <Route path="/admin/profile" element={<AdminProfile />} />

                          <Route path="/admin/products" element={<AdminProducts />} />
                          <Route path="/admin/products/review" element={<AdminProductReview />} />
                          <Route path="/admin/products/new" element={<ProductForm />} />
                          <Route path="/admin/products/:productId/edit" element={<ProductForm />} />
                          <Route path="/admin/products/:productId" element={<AdminProductDetail />} />
                          <Route path="/admin/products/:productId/media" element={<AdminProductMedia />} />

                          <Route path="/admin/media" element={<AdminMediaLibrary />} />
                          <Route path="/admin/media/upload" element={<AdminMediaUpload />} />
                          <Route path="/admin/media/review" element={<AdminMediaReview />} />
                          <Route path="/admin/media/marketing" element={<AdminMarketingMedia />} />
                          <Route path="/admin/media/product-mapping" element={<AdminMediaProductMapping />} />
                          <Route path="/admin/media/:mediaId" element={<AdminMediaDetail />} />
                          <Route path="/admin/categories" element={<AdminCategories />} />
                          <Route path="/admin/categories/new" element={<AdminCategoryForm />} />
                          <Route path="/admin/categories/:categoryId/edit" element={<AdminCategoryForm />} />
                          <Route path="/admin/categories/:categoryId/subcategories" element={<AdminCategoryDetail />} />
                          <Route path="/admin/categories/:categoryId" element={<AdminCategoryDetail />} />
                          <Route path="/admin/collections" element={<AdminCollections />} />
                          <Route path="/admin/collections/new" element={<AdminCollectionForm />} />
                          <Route path="/admin/collections/:collectionId/edit" element={<AdminCollectionForm />} />
                          <Route path="/admin/collections/:collectionId/products" element={<AdminCollectionDetail />} />
                          <Route path="/admin/collections/:collectionId" element={<AdminCollectionDetail />} />
                          <Route path="/admin/offers" element={<AdminOffers />} />
                          <Route path="/admin/offers/new" element={<AdminOfferFormPage />} />
                          <Route path="/admin/offers/:offerId/edit" element={<AdminOfferFormPage />} />
                          <Route path="/admin/offers/:offerId" element={<AdminOfferDetail />} />
                          {/* Phase 15 — Orders become operational */}
                          <Route path="/admin/orders" element={<AdminOrders />} />
                          <Route path="/admin/orders/:orderId" element={<AdminOrderDetail />} />
                          <Route path="/admin/orders/:orderId/invoice" element={<AdminOrderInvoice />} />
                          <Route path="/admin/customers" element={<AdminCustomers />} />
                          <Route path="/admin/customers/:customerId" element={<AdminCustomerDetail />} />
                          <Route path="/admin/returns" element={<AdminReturns />} />
                          <Route path="/admin/returns/:returnId" element={<AdminReturnDetail />} />
                          <Route path="/admin/inventory" element={<InventoryDashboardPage portal="admin" />} />
                          <Route path="/admin/inventory/receive" element={<InventoryOperationPage portal="admin" operation="receive" />} />
                          <Route path="/admin/inventory/adjust" element={<InventoryOperationPage portal="admin" operation="adjust" />} />
                          <Route path="/admin/inventory/transfers" element={<InventoryTransfersPage portal="admin" />} />
                          <Route path="/admin/inventory/movements" element={<InventoryMovementsPage portal="admin" />} />
                          <Route path="/admin/inventory/low-stock" element={<InventoryLowStockPage portal="admin" />} />
                          <Route path="/admin/warehouses" element={<Navigate to="/admin/inventory?locationType=WAREHOUSE" replace />} />
                          <Route path="/admin/stock-movements" element={<Navigate to="/admin/inventory/movements" replace />} />
                          <Route path="/admin/analytics" element={<AdminAnalytics />} />
                          <Route path="/admin/ai-assistant" element={<AiBusinessAssistant />} />
                          <Route path="/admin/analytics/sales" element={<AdminAnalytics />} />
                          <Route path="/admin/analytics/products" element={<AdminAnalytics />} />
                          <Route path="/admin/analytics/customers" element={<AdminAnalytics />} />
                          <Route path="/admin/analytics/inventory" element={<AdminAnalytics />} />
                          <Route path="/admin/analytics/returns" element={<AdminAnalytics />} />
                          <Route path="/admin/analytics/offers" element={<AdminAnalytics />} />
                          <Route path="/admin/settings" element={<AdminSettings />} />

                          <Route path="/admin/*" element={<AdminNotFound />} />
                        </Route>
                      </Route>

                      <Route path="/employee/login" element={<EmployeeLogin />} />
                      <Route path="/employee/forgot-password" element={<EmployeeForgotPassword />} />

                      <Route element={<EmployeeProtectedRoute />}>
                        <Route path="/employee/change-password" element={<EmployeeChangePassword />} />
                        <Route element={<EmployeeLayout />}>
                          <Route path="/employee" element={<EmployeeDashboard />} />
                          <Route path="/employee/profile" element={<EmployeeProfile />} />
                          <Route path="/employee/attendance" element={<EmployeeAttendance />} />
                          <Route path="/employee/attendance/leave" element={<EmployeeLeave />} />
                          <Route path="/employee/performance" element={<EmployeePerformance />} />
                          <Route path="/employee/performance/:employeeId" element={<EmployeePerformance />} />
                          <Route path="/employee/access-denied" element={<EmployeeAccessDenied />} />
                          <Route path="/employee/media" element={<EmployeeMediaDashboard />} />
                          <Route path="/employee/media/upload" element={<EmployeeMediaUpload />} />
                          <Route path="/employee/media/:mediaId" element={<EmployeeMediaDetail />} />
                          <Route path="/employee/products" element={<EmployeeProducts />} />
                          <Route path="/employee/products/review" element={<EmployeeProductReview />} />
                          <Route path="/employee/products/new" element={<EmployeeProductForm />} />
                          <Route path="/employee/products/:productId/edit" element={<EmployeeProductForm />} />
                          <Route path="/employee/customers" element={<EmployeeCustomers />} />
                          <Route path="/employee/orders" element={<EmployeeOrders />} />
                          <Route path="/employee/orders/assisted" element={<EmployeeAssistedOrder />} />
                          <Route path="/employee/orders/:orderId" element={<EmployeeOrderDetail />} />
                          <Route path="/employee/offers" element={<EmployeeOffers />} />
                          <Route path="/employee/offers/new" element={<EmployeeOfferForm />} />
                          <Route path="/employee/offers/:offerId/edit" element={<EmployeeOfferForm />} />
                          <Route path="/employee/offers/:offerId" element={<EmployeeOfferDetail />} />
                          <Route path="/employee/inventory" element={<InventoryDashboardPage portal="employee" />} />
                          <Route path="/employee/inventory/movements" element={<InventoryMovementsPage portal="employee" />} />
                          <Route path="/employee/inventory/transfers" element={<InventoryTransfersPage portal="employee" />} />
                          <Route path="/employee/inventory/low-stock" element={<InventoryLowStockPage portal="employee" />} />
                          <Route path="/employee/inventory/out-of-stock" element={<Navigate to="/employee/inventory/low-stock" replace />} />
                          <Route path="/employee/inventory/receive" element={<InventoryOperationPage portal="employee" operation="receive" />} />
                          <Route path="/employee/inventory/adjust" element={<InventoryOperationPage portal="employee" operation="adjust" />} />
                          <Route path="/employee/inventory/requests" element={<Navigate to="/employee/inventory/transfers" replace />} />
                          <Route path="/employee/warehouse" element={<EmployeeDesk />} />
                          <Route path="/employee/warehouse/incoming" element={<EmployeeDesk />} />
                          <Route path="/employee/warehouse/outgoing" element={<EmployeeDesk />} />
                          <Route path="/employee/warehouse/pick-pack" element={<EmployeeDesk />} />
                          <Route path="/employee/warehouse/transfers" element={<EmployeeDesk />} />
                          <Route path="/employee/warehouse/damaged" element={<EmployeeDesk />} />
                          <Route path="/employee/returns" element={<EmployeeDesk />} />
                          <Route path="/employee/support" element={<EmployeeDesk />} />
                          <Route path="/employee/support/cases" element={<EmployeeDesk />} />
                          <Route path="/employee/support/returns" element={<EmployeeDesk />} />
                          <Route path="/employee/support/feedback" element={<EmployeeDesk />} />
                          <Route path="/employee/styling" element={<EmployeeDesk />} />
                          <Route path="/employee/styling/requests" element={<EmployeeDesk />} />
                          <Route path="/employee/styling/appointments" element={<EmployeeDesk />} />
                          <Route path="/employee/styling/recommendations" element={<EmployeeDesk />} />
                          <Route path="/employee/styling/bridal" element={<EmployeeDesk />} />
                          <Route path="/employee/styling/wedding" element={<EmployeeDesk />} />
                          <Route path="/employee/sales" element={<EmployeeDesk />} />
                          <Route path="/employee/team" element={<EmployeeDesk />} />
                          <Route path="/employee/reports" element={<EmployeeReports />} />
                          <Route path="/employee/reports/sales" element={<EmployeeReports />} />
                          <Route path="/employee/reports/products" element={<EmployeeReports />} />
                          <Route path="/employee/reports/customers" element={<EmployeeReports />} />
                          <Route path="/employee/reports/inventory" element={<EmployeeReports />} />
                          <Route path="/employee/reports/returns" element={<EmployeeReports />} />
                          <Route path="/employee/reports/offers" element={<EmployeeReports />} />
                          <Route path="/employee/reports/employees" element={<EmployeeReports />} />
                          {/* Legacy people-admin URL is retained only as a safe
                              self-profile redirect. Employee account management
                              exists exclusively at /admin/employees. */}
                          <Route path="/employee/management/*" element={<Navigate to="/employee/profile" replace />} />
                        </Route>
                      </Route>

                      <Route element={<CustomerLayout />}>
                        <Route index element={<AtelierDesign />} />

                        <Route path="/shop" element={<Shop />} />
                        <Route path="/explore" element={<Explore />} />
                        <Route path="/category/:slug" element={<CatalogueListing variant="category" />} />
                        <Route path="/collection/:slug" element={<LegacyCollectionRedirect />} />
                        <Route path="/collections/:slug" element={<CatalogueListing variant="collection" />} />
                        <Route path="/search" element={<SearchResults />} />
                        <Route path="/product/:productId" element={<ProductDetail />} />

                        <Route path="/cart" element={<Cart />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/order-success" element={<OrderSuccess />} />
                        <Route path="/account/wishlist" element={<Wishlist />} />
                        <Route path="/wishlist" element={<Navigate to="/account/wishlist" replace />} />

                        <Route path="/signin" element={<SignIn />} />
                        <Route path="/signup" element={<SignUp />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/reset-password" element={<ResetPassword />} />

                        <Route path="/account/orders/:orderId" element={<OrderDetail />} />
                        <Route path="/account/orders/:orderId/track" element={<OrderTracking />} />
                        <Route path="/account/orders/:orderId/return" element={<OrderReturn />} />

                        <Route element={<ProtectedRoute />}>
                          <Route path="/account" element={<AccountDashboard />} />
                          <Route path="/account/profile" element={<AccountProfile />} />
                          <Route path="/account/addresses" element={<AccountAddresses />} />
                          <Route path="/account/orders" element={<AccountOrders />} />
                          <Route path="/account/settings" element={<AccountSettings />} />
                          <Route path="/account/security" element={<AccountSecurity />} />
                          <Route path="/account/preferences" element={<AccountPreferences />} />
                          <Route path="/account/ai-mirror" element={<AiMirror />} />
                          <Route path="/account/ai-shopping" element={<AiShoppingAssistant />} />
                        </Route>

                        {routeManifest
                          .filter((route) => !dedicatedPaths.has(route.path))
                          .map((route) => (
                            <Route
                              key={route.path}
                              path={route.path}
                              element={
                                hasNavigationScope(route.path) ? (
                                  <CatalogueListing variant="navigation" />
                                ) : (
                                  <CategoryPage />
                                )
                              }
                            />
                          ))}

                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                    </Suspense>
                    </WorkforceProvider>
                      </EmployeeManagementProvider>
                    </AdminAuthProvider>
                  </EmployeeAuthProvider>
                </CheckoutProvider>
              </OrderProvider>
            </ShoppingProvider>
          </InventoryProvider>
        </AccountProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
