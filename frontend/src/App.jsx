import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import AdminLayout from './components/AdminLayout';
import Home from './pages/Home';
import RecipeDetail from './pages/RecipeDetail';
import RecipeForm from './pages/RecipeForm';
import Login from './pages/Login';
import Dashboard from './pages/admin/Dashboard';
import AdminRecipes from './pages/admin/AdminRecipes';
import PdfUpload from './pages/admin/PdfUpload';
import UrlImport from './pages/admin/UrlImport';
import PendingRecipes from './pages/admin/PendingRecipes';
import PendingRecipeReview from './pages/admin/PendingRecipeReview';
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
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
