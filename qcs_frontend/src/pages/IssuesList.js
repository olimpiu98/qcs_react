"use client"

import { useState, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import axios from "axios"
import { format } from "date-fns"
import Layout from "../components/Layout"
import { useAuth } from "../context/AuthContext"

const API_URL = process.env.REACT_APP_API_URL || "/api"

const IssuesList = () => {
  const { isAdmin } = useAuth()
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])

  const [filters, setFilters] = useState({
    status: "",
    checkType: "",
    supplierId: "",
    productId: "",
    startDate: "",
    endDate: "",
    showCompleted: false,
    page: 1,
    limit: 10,
  })

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  })

  // Keep scroll position stable when switching pages
  const prevScrollYRef = useRef(0)
  const pagingChangeRef = useRef(false)

  useEffect(() => {
    fetchSuppliers()
    fetchProducts()
  }, [])

  useEffect(() => {
    fetchIssues()
  }, [filters])

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get(`${API_URL}/suppliers`)
      setSuppliers(response.data)
    } catch (error) {
      console.error("Failed to fetch suppliers:", error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await axios.get(`${API_URL}/products`)
      setProducts(response.data)
    } catch (error) {
      console.error("Failed to fetch products:", error)
    }
  }

  const fetchIssues = async () => {
    setLoading(true)
    setError("")

    try {
      const params = new URLSearchParams()
      Object.keys(filters).forEach((key) => {
        if (filters[key]) {
          params.append(key, filters[key])
        }
      })

      const response = await axios.get(`${API_URL}/issues?${params.toString()}`)
      setIssues(response.data.issues)
      setPagination(response.data.pagination)

      // Restore previous scroll position if this fetch was triggered by a page change
      if (pagingChangeRef.current) {
        const y = prevScrollYRef.current
        // Two rafs to ensure DOM painted
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo({ top: y, left: 0, behavior: "auto" })
            pagingChangeRef.current = false
          })
        })
      }
    } catch (err) {
      setError("Failed to fetch issues")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value, type, checked } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      page: 1,
    }))
  }

  const handlePageChange = (newPage) => {
    // Capture current scroll position before updating state
    prevScrollYRef.current = window.scrollY || window.pageYOffset || 0
    pagingChangeRef.current = true
    setFilters((prev) => ({ ...prev, page: newPage }))
  }

  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams()
      Object.keys(filters).forEach((key) => {
        if (filters[key] && key !== "page" && key !== "limit") {
          params.append(key, filters[key])
        }
      })

      const token = localStorage.getItem("token")
      
      // Create a temporary link to download with auth header
      const response = await axios.get(`${API_URL}/issues/export/csv?${params.toString()}`, {
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

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      awaiting_confirmation: "Awaiting Confirmation",
      accepted: "Accepted",
      rejected: "Rejected",
      resolved: "Resolved",
      complete: "Complete",
    }
    return labels[status] || status
  }

  return (
    <Layout>
      <div>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <div>
            <h2
              style={{
                fontSize: "2rem",
                fontWeight: "700",
                marginBottom: "0.5rem",
                color: "#000",
                letterSpacing: "-0.025em",
              }}
            >
              Issues Overview
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#737373" }}>Track and manage quality control issues</p>
          </div>
          <Link to="/issues/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: "1.125rem", marginRight: "0.25rem" }}>+</span>
            New Issue
          </Link>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}
          >
            <h3 style={{ fontSize: "1rem", fontWeight: "600", color: "#000" }}>Filters</h3>
            <button
              onClick={() =>
                setFilters({
                  status: "",
                  checkType: "",
                  supplierId: "",
                  productId: "",
                  startDate: "",
                  endDate: "",
                  showCompleted: false,
                  page: 1,
                  limit: 10,
                })
              }
              className="btn btn-secondary"
              style={{ fontSize: "0.8125rem", padding: "0.5rem 0.875rem" }}
            >
              Clear Filters
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select name="status" className="select" value={filters.status} onChange={handleFilterChange}>
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="awaiting_confirmation">Awaiting Confirmation</option>
                <option value="accepted">Accepted</option>
                <option value="rejected">Rejected</option>
                <option value="resolved">Resolved</option>
                <option value="complete">Complete</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Issue Type</label>
              <select name="checkType" className="select" value={filters.checkType} onChange={handleFilterChange}>
                <option value="">All Types</option>
                <option value="product">Quality Check</option>
                <option value="vehicle">Vehicle Check</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Supplier</label>
              <select name="supplierId" className="select" value={filters.supplierId} onChange={handleFilterChange}>
                <option value="">All Suppliers</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Start Date</label>
              <input
                type="date"
                name="startDate"
                className="input"
                value={filters.startDate}
                onChange={handleFilterChange}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">End Date</label>
              <input
                type="date"
                name="endDate"
                className="input"
                value={filters.endDate}
                onChange={handleFilterChange}
              />
            </div>

            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.625rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  name="showCompleted"
                  checked={filters.showCompleted}
                  onChange={handleFilterChange}
                  style={{ width: "16px", height: "16px", cursor: "pointer" }}
                />
                <span style={{ fontSize: "0.875rem", fontWeight: "500" }}>Show Completed</span>
              </label>
            </div>
          </div>
        </div>

        {/* Table Controls */}
        <div style={{ marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <label style={{ fontSize: "0.875rem", color: "#737373", fontWeight: "500" }}>Show:</label>
            <select
              name="limit"
              className="select"
              value={filters.limit}
              onChange={handleFilterChange}
              style={{ width: "auto", padding: "0.5rem 0.75rem" }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <span style={{ fontSize: "0.875rem", color: "#737373" }}>entries</span>
          </div>
          {isAdmin && (
            <button onClick={handleExportCSV} className="btn btn-secondary">
              Export CSV
            </button>
          )}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
          </div>
        ) : (
          <>
            {/* Table */}
            <div
              style={{
                overflowX: "auto",
                backgroundColor: "white",
                borderRadius: "0.75rem",
                border: "1px solid #e5e5e5",
                boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              }}
            >
              <table className="table">
                <thead>
                  <tr>
                    <th>Issue #</th>
                    <th>Date/Time</th>
                    <th>Status</th>
                    <th>Type</th>
                    <th>Supplier</th>
                    <th>Item No</th>
                    <th>Affected Item</th>
                    <th>Issue Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {issues.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: "3rem", color: "#737373" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
                        <div style={{ fontWeight: "500" }}>No issues found</div>
                        <div style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>Try adjusting your filters</div>
                      </td>
                    </tr>
                  ) : (
                    issues.map((issue) => (
                      <tr key={issue.id}>
                        <td style={{ fontWeight: "600", color: "#000" }}>{issue.issue_number}</td>
                        <td style={{ fontSize: "0.8125rem", color: "#525252" }}>
                          {format(new Date(issue.created_at), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td>
                          <span className={`status-badge status-${issue.status}`}>{getStatusLabel(issue.status)}</span>
                        </td>
                        <td style={{ fontSize: "0.875rem" }}>
                          {issue.check_type === "product" ? "Quality Check" : "Vehicle Check"}
                        </td>
                        <td style={{ fontSize: "0.875rem" }}>{issue.supplier_name || "-"}</td>
                        <td style={{ fontSize: "0.875rem", fontFamily: "monospace" }}>{issue.item_no || "-"}</td>
                        <td style={{ fontSize: "0.875rem" }}>{issue.affected_item || "-"}</td>
                        <td style={{ fontSize: "0.875rem" }}>{issue.issue_type || "-"}</td>
                        <td>
                          <Link
                            to={`/issues/${issue.id}`}
                            style={{
                              color: "#000",
                              textDecoration: "none",
                              fontSize: "0.875rem",
                              fontWeight: "500",
                              padding: "0.375rem 0.75rem",
                              borderRadius: "0.375rem",
                              border: "1px solid #e5e5e5",
                              display: "inline-block",
                              transition: "all 0.15s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = "#fafafa"
                              e.target.style.borderColor = "#d4d4d4"
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = "transparent"
                              e.target.style.borderColor = "#e5e5e5"
                            }}
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination under the table */}
            {pagination && pagination.total > 0 && (
              <div
                style={{
                  backgroundColor: "white",
                  border: "1px solid #e5e5e5",
                  borderRadius: "0.75rem",
                  marginTop: "1rem",
                  padding: "0.75rem 1rem",
                }}
              >
                <div
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}
                >
                  <div style={{ fontSize: "0.875rem", color: "#525252", fontWeight: "500" }}>
                    Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} issues
                  </div>
                  {pagination.totalPages > 1 && (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <button
                        onClick={() => handlePageChange(1)}
                        disabled={pagination.page === 1}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 0.875rem", fontSize: "0.875rem" }}
                      >
                        First
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={pagination.page === 1}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 0.875rem", fontSize: "0.875rem" }}
                      >
                        Previous
                      </button>
                      <span
                        style={{
                          padding: "0.5rem 1rem",
                          backgroundColor: "#000",
                          color: "white",
                          borderRadius: "0.5rem",
                          fontSize: "0.875rem",
                          fontWeight: "600",
                        }}
                      >
                        {pagination.page} / {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 0.875rem", fontSize: "0.875rem" }}
                      >
                        Next
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.totalPages)}
                        disabled={pagination.page >= pagination.totalPages}
                        className="btn btn-secondary"
                        style={{ padding: "0.5rem 0.875rem", fontSize: "0.875rem" }}
                      >
                        Last
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

export default IssuesList
