"use client"

import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import axios from "axios"
import { format } from "date-fns"
import Layout from "../components/Layout"
import { useAuth } from "../context/AuthContext"

const API_URL = process.env.REACT_APP_API_URL || "/api"

const IssueDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [issue, setIssue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState("")
  const [statusNotes, setStatusNotes] = useState("")
  const [updating, setUpdating] = useState(false)
  const [lightboxImage, setLightboxImage] = useState(null)

  // Open/close helpers for lightbox with scroll lock
  const openLightbox = (src) => {
    if (!src) return
    setLightboxImage(src)
    try {
      document.body.style.overflow = 'hidden'
    } catch {}
  }
  const closeLightbox = () => {
    setLightboxImage(null)
    try {
      document.body.style.overflow = ''
    } catch {}
  }

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeLightbox()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  const resolveImageSrc = (filePath) => {
    if (!filePath) return ''
    if (filePath.startsWith('http')) return filePath
    return `${API_URL}/uploads/${filePath.replace(/^\/+/, '')}`
  }

  useEffect(() => {
    fetchIssue()
  }, [id])

  const fetchIssue = async () => {
    setLoading(true)
    setError("")

    try {
      const response = await axios.get(`${API_URL}/issues/${id}`)
      setIssue(response.data)
    } catch (err) {
      setError("Failed to fetch issue details")
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async () => {
    if (!newStatus) return

    setUpdating(true)
    try {
      await axios.patch(`${API_URL}/issues/${id}/status`, {
        status: newStatus,
        notes: statusNotes,
      })
      setShowStatusModal(false)
      setNewStatus("")
      setStatusNotes("")
      fetchIssue()
    } catch (err) {
      alert("Failed to update status")
    } finally {
      setUpdating(false)
    }
  }

  const handleSetComplete = async () => {
    if (!window.confirm("Mark this issue as complete? This will hide it from the main issues list.")) {
      return
    }

    setUpdating(true)
    try {
      await axios.patch(`${API_URL}/issues/${id}/complete`)
      alert("Issue marked as complete successfully!")
      navigate("/issues")
    } catch (err) {
      alert("Failed to mark issue as complete")
    } finally {
      setUpdating(false)
    }
  }

  const getStatusLabel = (status) => {
    const labels = {
      pending: "Pending",
      awaiting_confirmation: "Awaiting desk confirmation",
      accepted: "Confirm accepted",
      rejected: "Confirm rejected",
      resolved: "Resolved",
      complete: "Complete",
    }
    return labels[status] || status
  }

  if (loading) {
    return (
      <Layout>
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </Layout>
    )
  }

  if (error || !issue) {
    return (
      <Layout>
        <div className="alert alert-error">{error || "Issue not found"}</div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div>
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
              Issue #{issue.issue_number}
            </h2>
            <p style={{ fontSize: "0.9375rem", color: "#737373" }}>View and manage issue details</p>
          </div>
          <button onClick={() => navigate("/issues")} className="btn btn-secondary">
            ← Back to Issues
          </button>
        </div>

        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#737373",
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: "600",
                }}
              >
                Current Status
              </p>
              <span
                className={`status-badge status-${issue.status}`}
                style={{ fontSize: "0.875rem", padding: "0.5rem 1rem" }}
              >
                {getStatusLabel(issue.status)}
              </span>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#737373",
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: "600",
                }}
              >
                Check Type
              </p>
              <p style={{ fontWeight: "600", fontSize: "0.9375rem", color: "#000" }}>
                {issue.check_type === "product" ? "Product Quality" : "Vehicle Check"}
              </p>
            </div>
          </div>

          {isAdmin && (
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}
            >
              <button className="btn btn-secondary">Download PDF</button>
              <button className="btn btn-secondary">Feedback Form</button>
              <button className="btn btn-secondary">Send Email</button>
              <button onClick={() => setShowStatusModal(true)} className="btn btn-primary">
                Change Status
              </button>
              <button onClick={handleSetComplete} className="btn btn-success" disabled={updating || issue.is_complete}>
                {issue.is_complete ? "Completed" : "Set Complete"}
              </button>
            </div>
          )}
        </div>

        {/* Issue Details */}
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", color: "#000" }}>
            Issue Details
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#737373",
                  marginBottom: "0.375rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: "600",
                }}
              >
                Created
              </p>
              <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000" }}>
                {format(new Date(issue.created_at), "dd/MM/yyyy HH:mm")}
              </p>
            </div>
            <div>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#737373",
                  marginBottom: "0.375rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: "600",
                }}
              >
                Created By
              </p>
              <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000" }}>{issue.created_by_name}</p>
            </div>
            {issue.supplier_name && (
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#737373",
                    marginBottom: "0.375rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: "600",
                  }}
                >
                  Supplier
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000" }}>{issue.supplier_name}</p>
              </div>
            )}
            {issue.product_name && (
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#737373",
                    marginBottom: "0.375rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: "600",
                  }}
                >
                  Product
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000" }}>{issue.product_name}</p>
              </div>
            )}
            {issue.item_no && (
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#737373",
                    marginBottom: "0.375rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: "600",
                  }}
                >
                  Item No
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000", fontFamily: "monospace" }}>
                  {issue.item_no}
                </p>
              </div>
            )}
            {issue.affected_item && (
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#737373",
                    marginBottom: "0.375rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: "600",
                  }}
                >
                  Affected Item
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000" }}>{issue.affected_item}</p>
              </div>
            )}
            {issue.lot_number && (
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#737373",
                    marginBottom: "0.375rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: "600",
                  }}
                >
                  Lot Number
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000", fontFamily: "monospace" }}>
                  {issue.lot_number}
                </p>
              </div>
            )}
            {issue.origin && (
              <div>
                <p
                  style={{
                    fontSize: "0.75rem",
                    color: "#737373",
                    marginBottom: "0.375rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: "600",
                  }}
                >
                  Origin
                </p>
                <p style={{ fontSize: "0.9375rem", fontWeight: "500", color: "#000" }}>{issue.origin}</p>
              </div>
            )}
          </div>

          {issue.description && (
            <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #f5f5f5" }}>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#737373",
                  marginBottom: "0.5rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: "600",
                }}
              >
                Description
              </p>
              <p style={{ whiteSpace: "pre-wrap", fontSize: "0.9375rem", lineHeight: "1.6", color: "#525252" }}>
                {issue.description}
              </p>
            </div>
          )}
        </div>

        {/* Photos with click-to-zoom */}
        {issue.photos && issue.photos.length > 0 && (
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", color: "#000" }}>
              Photos ({issue.photos.length})
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
              {issue.photos.map((photo) => (
                <div
                  key={photo.id}
                  style={{
                    border: "1px solid #e5e5e5",
                    borderRadius: "0.5rem",
                    padding: "0.5rem",
                    backgroundColor: "#fafafa",
                    cursor: "zoom-in",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => openLightbox(resolveImageSrc(photo.file_path))}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.02)"
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                >
                  <img
                    onClick={() => openLightbox(resolveImageSrc(photo.file_path))}
                    src={resolveImageSrc(photo.file_path)}
                    alt={photo.file_name}
                    style={{ width: "100%", height: "150px", objectFit: "cover", borderRadius: "0.375rem" }}
                  />
                  <p
                    style={{
                      fontSize: "0.75rem",
                      color: "#737373",
                      marginTop: "0.5rem",
                      textAlign: "center",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {photo.file_name}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit Trail */}
        {issue.auditTrail && issue.auditTrail.length > 0 && (
          <div className="card">
            <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "1.5rem", color: "#000" }}>
              Activity History
            </h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              {issue.auditTrail.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    padding: "1rem",
                    backgroundColor: "#fafafa",
                    borderRadius: "0.5rem",
                    borderLeft: "3px solid #000",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: "0.5rem",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ fontWeight: "600", fontSize: "0.9375rem", color: "#000" }}>{entry.user_name}</span>
                    <span style={{ fontSize: "0.8125rem", color: "#737373" }}>
                      {format(new Date(entry.created_at), "dd/MM/yyyy HH:mm")}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.875rem", color: "#525252" }}>
                    {entry.action === "status_change" ? (
                      <>
                        Changed status from <strong>{getStatusLabel(entry.old_status)}</strong> to{" "}
                        <strong>{getStatusLabel(entry.new_status)}</strong>
                      </>
                    ) : (
                      entry.action
                    )}
                  </p>
                  {entry.notes && (
                    <p style={{ fontSize: "0.875rem", color: "#737373", marginTop: "0.5rem", fontStyle: "italic" }}>
                      {entry.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Change Modal */}
        {showStatusModal && (
          <div className="modal-overlay" onClick={() => setShowStatusModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#000" }}>Change Status</h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    color: "#737373",
                  }}
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">New Status</label>
                  <select className="select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                    <option value="">Select status...</option>
                    <option value="pending">Pending</option>
                    <option value="awaiting_confirmation">Awaiting Confirmation</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <textarea
                    className="textarea"
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    placeholder="Add notes about this status change..."
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowStatusModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button onClick={handleStatusChange} className="btn btn-primary" disabled={!newStatus || updating}>
                  {updating ? "Updating..." : "Update Status"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image lightbox modal for zooming */}
        {lightboxImage && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              zIndex: 9999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
              cursor: "zoom-out",
            }}
            onClick={closeLightbox}
            role="dialog"
            aria-modal="true"
          >
            <button
              onClick={closeLightbox}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                background: "white",
                border: "none",
                borderRadius: "50%",
                width: "40px",
                height: "40px",
                fontSize: "1.5rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
              }}
            >
              ×
            </button>
            <img
              src={lightboxImage || "/placeholder.svg"}
              alt="Zoomed view"
              style={{
                maxWidth: "90%",
                maxHeight: "90%",
                objectFit: "contain",
                borderRadius: "0.5rem",
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </Layout>
  )
}

export default IssueDetails
