"use client"
import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import Layout from "../components/Layout"
import { useAuth } from "../context/AuthContext"

const API_URL = process.env.REACT_APP_API_URL || "/api"

const AdminDashboard = () => {
  const { isAdmin } = useAuth()
  const [stats, setStats] = useState({
    totalIssues: 0,
    pendingIssues: 0,
    resolvedToday: 0,
    activeUsers: 0,
  })
  const [recentIssues, setRecentIssues] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData()
    }
  }, [isAdmin])

  const fetchAdminData = async () => {
    setLoading(true)
    try {
      // Fetch issues for stats
      const issuesResponse = await axios.get(`${API_URL}/issues?limit=5`)
      const allIssues = issuesResponse.data.issues

      setStats({
        totalIssues: issuesResponse.data.pagination.total,
        pendingIssues: allIssues.filter((i) => i.status === "pending").length,
        resolvedToday: allIssues.filter((i) => i.status === "resolved").length,
        activeUsers: 2, // Placeholder
      })

      setRecentIssues(allIssues.slice(0, 5))
    } catch (error) {
      console.error("Failed to fetch admin data:", error)
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

  if (!isAdmin) {
    return (
      <Layout>
        <div className="alert alert-error">Access denied. Admin privileges required.</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div>
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
            Admin Dashboard
          </h2>
          <p style={{ fontSize: "1rem", color: "#737373" }}>System overview and management tools</p>
        </div>

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
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
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "0.875rem", opacity: 0.8, marginBottom: "0.5rem" }}>Total Issues</p>
                    <p style={{ fontSize: "2.5rem", fontWeight: "700", lineHeight: "1" }}>{stats.totalIssues}</p>
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
                    📊
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#737373", marginBottom: "0.5rem" }}>Pending Review</p>
                    <p style={{ fontSize: "2.5rem", fontWeight: "700", lineHeight: "1", color: "#000" }}>
                      {stats.pendingIssues}
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
              </div>

              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#737373", marginBottom: "0.5rem" }}>Resolved Today</p>
                    <p style={{ fontSize: "2.5rem", fontWeight: "700", lineHeight: "1", color: "#000" }}>
                      {stats.resolvedToday}
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
              </div>

              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "0.875rem", color: "#737373", marginBottom: "0.5rem" }}>Active Users</p>
                    <p style={{ fontSize: "2.5rem", fontWeight: "700", lineHeight: "1", color: "#000" }}>
                      {stats.activeUsers}
                    </p>
                  </div>
                  <div
                    style={{
                      width: "48px",
                      height: "48px",
                      backgroundColor: "#dbeafe",
                      borderRadius: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "1.5rem",
                    }}
                  >
                    👥
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Actions */}
            <div className="card" style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", color: "#000" }}>
                Admin Actions
              </h3>
              <div
                style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}
              >
                <button onClick={handleExportCSV} className="btn btn-primary" style={{ padding: "1rem" }}>
                  Export All Data
                </button>
                <button onClick={handleExportCSV} className="btn btn-secondary" style={{ padding: "1rem" }}>
                  Generate Report
                </button>
                <button className="btn btn-secondary" style={{ padding: "1rem" }}>
                  Manage Users
                </button>
                <button className="btn btn-secondary" style={{ padding: "1rem" }}>
                  System Settings
                </button>
                <button className="btn btn-secondary" style={{ padding: "1rem" }}>
                  Backup Database
                </button>
                <button className="btn btn-secondary" style={{ padding: "1rem" }}>
                  View Audit Logs
                </button>
              </div>
            </div>

            {/* Recent Issues */}
            <div className="card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                }}
              >
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#000" }}>Recent Issues</h3>
                <Link to="/issues" style={{ fontSize: "0.875rem", color: "#000", textDecoration: "none" }}>
                  View All →
                </Link>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                {recentIssues.map((issue) => (
                  <div
                    key={issue.id}
                    style={{
                      padding: "1rem",
                      backgroundColor: "#fafafa",
                      borderRadius: "0.5rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      border: "1px solid #f5f5f5",
                    }}
                  >
                    <div>
                      <p style={{ fontWeight: "600", fontSize: "0.9375rem", color: "#000", marginBottom: "0.25rem" }}>
                        Issue #{issue.issue_number}
                      </p>
                      <p style={{ fontSize: "0.8125rem", color: "#737373" }}>
                        {issue.supplier_name || "No supplier"} • {issue.check_type}
                      </p>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <span className={`status-badge status-${issue.status}`} style={{ fontSize: "0.75rem" }}>
                        {issue.status}
                      </span>
                      <Link
                        to={`/issues/${issue.id}`}
                        className="btn btn-secondary"
                        style={{ textDecoration: "none", padding: "0.5rem 0.875rem", fontSize: "0.8125rem" }}
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}

export default AdminDashboard
