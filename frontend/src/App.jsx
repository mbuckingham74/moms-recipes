import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import RecipeForm from './pages/RecipeForm';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/admin/Dashboard';
import AdminRecipes from './pages/admin/AdminRecipes';
import PdfUpload from './pages/admin/PdfUpload';
import UrlImport from './pages/admin/UrlImport';
import PendingRecipes from './pages/admin/PendingRecipes';
import PendingRecipeReview from './pages/admin/PendingRecipeReview';
import AISettings from './pages/admin/AISettings';
import UserSubmissions from './pages/admin/UserSubmissions';
import UserDashboard from './pages/user/UserDashboard';
import SavedRecipes from './pages/user/SavedRecipes';
import SubmitRecipe from './pages/user/SubmitRecipe';
import MySubmissions from './pages/user/MySubmissions';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app">
          <Header />
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Home />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* User routes (protected - any logged in user) */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <UserDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/saved-recipes"
              element={
                <ProtectedRoute>
                  <SavedRecipes />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submit-recipe"
              element={
                <ProtectedRoute>
                  <SubmitRecipe />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-submissions"
              element={
                <ProtectedRoute>
                  <MySubmissions />
                </ProtectedRoute>
              }
            />

            {/* Admin routes (protected) - wrapped in AdminLayout */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout>
                    <Dashboard />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/recipes"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout>
                    <AdminRecipes />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/upload"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout>
                    <PdfUpload />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/import-url"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout>
                    <UrlImport />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pending"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout>
                    <PendingRecipes />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/pending/:id"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout>
                    <PendingRecipeReview />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/add"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout>
                    <RecipeForm />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/edit/:id"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout>
                    <RecipeForm />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/settings/ai"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout>
                    <AISettings />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/user-submissions"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout>
                    <UserSubmissions />
                  </AdminLayout>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
