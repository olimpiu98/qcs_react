"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import Layout from "../components/Layout"

const API_URL = process.env.REACT_APP_API_URL || "/api"

const CreateIssue = () => {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [suppliers, setSuppliers] = useState([])
  const [products, setProducts] = useState([])

  const [formData, setFormData] = useState({
    checkType: "product",
    // Vehicle fields
    haulier: "",
    lorryRegistration: "",
    vehicleOrigin: "",
    // Product fields
    supplierId: "",
    productId: "",
    origin: "",
    lotNumber: "",
    itemNo: "",
    affectedItem: "",
    // Case info
    palletsAffected: "",
    palletType: "EP",
    totalCasesAffected: "",
    piecesPerUnit: "",
    quantityType: "average_count",
    // Issue details
    issueType: "Quality",
    description: "",
    notes: "",
    photos: [],
  })

  useEffect(() => {
    fetchSuppliers()
    fetchProducts()
  }, [])

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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    setFormData((prev) => ({ ...prev, photos: files }))
  }

  const handleNext = () => {
    if (step === 1) {
      if (formData.checkType === "product" && !formData.supplierId) {
        setError("Please select a supplier")
        return
      }
      if (formData.checkType === "vehicle" && !formData.haulier) {
        setError("Please enter haulier information")
        return
      }
    }
    setError("")
    setStep(step + 1)
  }

  const handleBack = () => {
    setError("")
    setStep(step - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const token = localStorage.getItem("token")
      const submitData = new FormData()

      // Add all form fields
      Object.keys(formData).forEach((key) => {
        if (key !== "photos" && formData[key]) {
          submitData.append(key, formData[key])
        }
      })

      // Add photos
      formData.photos.forEach((photo) => {
        submitData.append("photos", photo)
      })

      const response = await axios.post(`${API_URL}/issues`, submitData, {
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      })

      navigate(`/issues/${response.data.issueId}`)
    } catch (err) {
      console.error("Create issue error:", err)
      setError(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || "Failed to create issue")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h2 style={{ fontSize: "1.875rem", fontWeight: "bold", marginBottom: "1.5rem", color: "#000" }}>
          New Issue
        </h2>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          {/* Step 1: Check Type and Basic Info */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem" }}>
                What type of check are you submitting?
              </h3>

              <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="checkType"
                    value="vehicle"
                    checked={formData.checkType === "vehicle"}
                    onChange={handleChange}
                  />
                  <span>Vehicle check</span>
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="radio"
                    name="checkType"
                    value="product"
                    checked={formData.checkType === "product"}
                    onChange={handleChange}
                  />
                  <span>Product</span>
                </label>
              </div>

              {formData.checkType === "vehicle" ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Haulier</label>
                    <input
                      type="text"
                      name="haulier"
                      className="input"
                      value={formData.haulier}
                      onChange={handleChange}
                      style={{ backgroundColor: "#fef3c7" }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lorry Registration</label>
                    <input
                      type="text"
                      name="lorryRegistration"
                      className="input"
                      value={formData.lorryRegistration}
                      onChange={handleChange}
                      style={{ backgroundColor: "#fef3c7" }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Vehicle Origin</label>
                    <input
                      type="text"
                      name="vehicleOrigin"
                      className="input"
                      value={formData.vehicleOrigin}
                      onChange={handleChange}
                      style={{ backgroundColor: "#fef3c7" }}
                    />
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">Supplier</label>
                    <select
                      name="supplierId"
                      className="select"
                      value={formData.supplierId}
                      onChange={handleChange}
                      style={{ backgroundColor: "#fef3c7" }}
                    >
                      <option value="">--Please Select--</option>
                      {suppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name} - {supplier.code}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Origin</label>
                    <input
                      type="text"
                      name="origin"
                      className="input"
                      value={formData.origin}
                      onChange={handleChange}
                      style={{ backgroundColor: "#fef3c7" }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lot Number</label>
                    <input
                      type="text"
                      name="lotNumber"
                      className="input"
                      value={formData.lotNumber}
                      onChange={handleChange}
                      style={{ backgroundColor: "#fef3c7" }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Product</label>
                    <select
                      name="productId"
                      className="select"
                      value={formData.productId}
                      onChange={handleChange}
                      style={{ backgroundColor: "#fef3c7" }}
                    >
                      <option value="">--Please Select--</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} - {product.item_no}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Item No</label>
                    <input
                      type="text"
                      name="itemNo"
                      className="input"
                      value={formData.itemNo}
                      onChange={handleChange}
                      style={{ backgroundColor: "#fef3c7" }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Affected Item</label>
                    <input
                      type="text"
                      name="affectedItem"
                      className="input"
                      value={formData.affectedItem}
                      onChange={handleChange}
                      style={{ backgroundColor: "#fef3c7" }}
                    />
                  </div>
                </div>
              )}

              <div style={{ marginTop: "2rem", display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleNext} className="btn btn-primary">
                  Next &gt;&gt;
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Case Information */}
          {step === 2 && formData.checkType === "product" && (
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem" }}>Case info</h3>

              <div className="form-group">
                <label className="form-label">How many pallets are affected?</label>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                  <input
                    type="number"
                    name="palletsAffected"
                    className="input"
                    value={formData.palletsAffected}
                    onChange={handleChange}
                    style={{ maxWidth: "150px" }}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="radio"
                      name="palletType"
                      value="EP"
                      checked={formData.palletType === "EP"}
                      onChange={handleChange}
                    />
                    <span>EP</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="radio"
                      name="palletType"
                      value="DD"
                      checked={formData.palletType === "DD"}
                      onChange={handleChange}
                    />
                    <span>DD</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Total number of cases that are affected by the issue</label>
                <input
                  type="number"
                  name="totalCasesAffected"
                  className="input"
                  value={formData.totalCasesAffected}
                  onChange={handleChange}
                  style={{ maxWidth: "150px" }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantity of pieces affected within a unit/punnet/pack</label>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="number"
                    name="piecesPerUnit"
                    className="input"
                    value={formData.piecesPerUnit}
                    onChange={handleChange}
                    style={{ maxWidth: "150px" }}
                  />
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="radio"
                      name="quantityType"
                      value="percent"
                      checked={formData.quantityType === "percent"}
                      onChange={handleChange}
                    />
                    <span>Percent</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="radio"
                      name="quantityType"
                      value="average_count"
                      checked={formData.quantityType === "average_count"}
                      onChange={handleChange}
                    />
                    <span>Average count</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="radio"
                      name="quantityType"
                      value="average_weight"
                      checked={formData.quantityType === "average_weight"}
                      onChange={handleChange}
                    />
                    <span>Average weight</span>
                  </label>
                </div>
              </div>

              <div style={{ marginTop: "2rem", display: "flex", justifyContent: "space-between" }}>
                <button onClick={handleBack} className="btn btn-secondary">
                  &lt;&lt; Back
                </button>
                <button onClick={handleNext} className="btn btn-primary">
                  Next &gt;&gt;
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Issue Details and Photos */}
          {((step === 3 && formData.checkType === "product") || (step === 2 && formData.checkType === "vehicle")) && (
            <form onSubmit={handleSubmit}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem" }}>Issue Details</h3>

              <div className="form-group">
                <label className="form-label">Issue Type</label>
                <input
                  type="text"
                  name="issueType"
                  className="input"
                  value={formData.issueType}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  name="description"
                  className="textarea"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe the issue in detail..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  name="notes"
                  className="textarea"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="Additional notes..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Photos (up to 10)</label>
                <input type="file" accept="image/*" multiple onChange={handleFileChange} style={{ display: "block" }} />
                {formData.photos.length > 0 && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#6b7280" }}>
                    {formData.photos.length} photo(s) selected
                  </div>
                )}
              </div>

              <div style={{ marginTop: "2rem", display: "flex", justifyContent: "space-between" }}>
                <button type="button" onClick={handleBack} className="btn btn-secondary">
                  &lt;&lt; Back
                </button>
                <button type="submit" className="btn btn-success" disabled={loading}>
                  {loading ? "Creating..." : "Create Issue"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default CreateIssue
