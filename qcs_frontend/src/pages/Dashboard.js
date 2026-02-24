"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import Layout from "../components/Layout"
import { useAuth } from "../context/AuthContext"

const API_URL = process.env.REACT_APP_API_URL || "/api"

const Dashboard = () => {
  const { user, isAdmin } = useAuth()
  const [stats, setStats] = useState({
    activeIssues: 0,
    pendingReview: 0,
    resolvedOrCompleted: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const todayLocal = new Date()
      const yyyy = todayLocal.getFullYear()
      const mm = String(todayLocal.getMonth() + 1).padStart(2, '0')
      const dd = String(todayLocal.getDate()).padStart(2, '0')
      const todayStr = `${yyyy}-${mm}-${dd}`

      const [activeRes, pendingRes, resolvedRes] = await Promise.all([
        axios.get(`${API_URL}/issues?showCompleted=false&limit=1000`),
        axios.get(`${API_URL}/issues?status=awaiting_confirmation&showCompleted=false&limit=1000`),
        axios.get(`${API_URL}/issues?status=resolved_or_complete&limit=1000`),
      ])

      setStats({
        activeIssues: activeRes.data.pagination?.total || 0,
        pendingReview: pendingRes.data.pagination?.total || 0,
        resolvedOrCompleted: resolvedRes.data.pagination?.total || 0,
      })
    } catch (error) {
      console.error("Failed to fetch stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleExportCSV = async () => {
    try {
      const token = localStorage.getItem("token")
      
      const response = await axios.get(`${API_URL}/issues/export/csv`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `issues-export-${Date.now()}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export failed:", error)
      alert("Failed to export CSV. Please try again.")
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Welcome Section */}
        <div style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: "700",
              marginBottom: "0.5rem",
              color: "#000",
              letterSpacing: "-0.025em",
            }}
          >
            Welcome back, {user?.fullName?.split(" ")[0] || user?.username}
          </h2>
          <p style={{ fontSize: "1rem", color: "#737373" }}>
            Manage quality control issues and track supplier performance
          </p>
        </div>

        {/* Quick Stats */}
        {loading ? (
          <div className="loading" style={{ padding: "3rem" }}>
            <div className="spinner"></div>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            <div
              className="card"
              style={{ background: "linear-gradient(135deg, #000 0%, #171717 100%)", color: "white", border: "none" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <p style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>Active Issues</p>
                  <p style={{ fontSize: "2.5rem", fontWeight: "700", lineHeight: "1" }}>{stats.activeIssues}</p>
                </div>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                  }}
                >
                  📋
                </div>
              </div>
              <p style={{ fontSize: "0.75rem", opacity: 0.7 }}>Currently being tracked</p>
            </div>

            <div className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#737373", marginBottom: "0.5rem" }}>Pending Review</p>
                  <p style={{ fontSize: "2.5rem", fontWeight: "700", lineHeight: "1", color: "#000" }}>
                    {stats.pendingReview}
                  </p>
                </div>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    backgroundColor: "#fef3c7",
                    borderRadius: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                  }}
                >
                  ⏳
                </div>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#737373" }}>Requires attention</p>
            </div>

            <div className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: "1rem",
                }}
              >
                <div>
                  <p style={{ fontSize: "0.875rem", color: "#737373", marginBottom: "0.5rem" }}>Resolved/Completed</p>
                  <p style={{ fontSize: "2.5rem", fontWeight: "700", lineHeight: "1", color: "#000" }}>
                    {stats.resolvedOrCompleted}
                  </p>
                </div>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    backgroundColor: "#d1fae5",
                    borderRadius: "0.5rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                  }}
                >
                  ✓
                </div>
              </div>
              <p style={{ fontSize: "0.75rem", color: "#737373" }}>Great progress!</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="card" style={{ marginBottom: "2rem" }}>
          <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", color: "#000" }}>
            Quick Actions
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <Link
              to="/issues/new"
              className="btn btn-primary"
              style={{ textDecoration: "none", textAlign: "center", padding: "1rem" }}
            >
              <span style={{ fontSize: "1.25rem", marginRight: "0.5rem" }}>+</span>
              Create New Issue
            </Link>
            <Link
              to="/issues"
              className="btn btn-secondary"
              style={{ textDecoration: "none", textAlign: "center", padding: "1rem" }}
            >
              View All Issues
            </Link>
            {isAdmin && (
              <button onClick={handleExportCSV} className="btn btn-secondary" style={{ padding: "1rem" }}>
                Export Reports
              </button>
            )}
          </div>
        </div>

        {/* Account Info & Permissions */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          <div className="card">
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.25rem", color: "#000" }}>
              Account Information
            </h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#737373",
                    marginBottom: "0.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Username
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000" }}>{user?.username}</p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#737373",
                    marginBottom: "0.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Full Name
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000" }}>{user?.fullName}</p>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#737373",
                    marginBottom: "0.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Role
                </p>
                <span
                  className="badge"
                  style={{
                    backgroundColor: isAdmin ? "#000" : "#f5f5f5",
                    color: isAdmin ? "white" : "#525252",
                    textTransform: "capitalize",
                    padding: "0.375rem 0.75rem",
                  }}
                >
                  {user?.role}
                </span>
              </div>
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#737373",
                    marginBottom: "0.25rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Email
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000" }}>{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.25rem", color: "#000" }}>
              Your Permissions
            </h3>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#d1fae5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                  }}
                >
                  ✓
                </div>
                <span style={{ fontSize: "0.875rem", color: "#525252" }}>Create and manage issues</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#d1fae5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                  }}
                >
                  ✓
                </div>
                <span style={{ fontSize: "0.875rem", color: "#525252" }}>Upload photos and documents</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    backgroundColor: "#d1fae5",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                  }}
                >
                  ✓
                </div>
                <span style={{ fontSize: "0.875rem", color: "#525252" }}>View all quality reports</span>
              </div>
              {isAdmin && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: "#d1fae5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                      }}
                    >
                      ✓
                    </div>
                    <span style={{ fontSize: "0.875rem", color: "#525252" }}>Change issue status</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: "#d1fae5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                      }}
                    >
                      ✓
                    </div>
                    <span style={{ fontSize: "0.875rem", color: "#525252" }}>Assign issues to team members</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        backgroundColor: "#d1fae5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                      }}
                    >
                      ✓
                    </div>
                    <span style={{ fontSize: "0.875rem", color: "#525252" }}>Export data and analytics</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default Dashboard
