"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Badge } from "@/components/Badge";
import { useUi } from "@/app/context/UiContext";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCompany } from "@/lib/hooks/useCompany";
import * as companyApi from "@/lib/api/company";
import { useCompanyDocuments } from "@/lib/hooks/useCompanyDocuments";
import { useDepartments } from "@/lib/hooks/useDepartments";

export function SettingsSidebar() {
  const { settingsOpen, closeSettings } = useUi();
  const { logout, user } = useAuth();
  const { company, setCompany, documents, removeDocument } = useCompany();
  const router = useRouter();

  const [companyName, setCompanyName] = useState(company?.name || "");
  const [industry, setIndustry] = useState(company?.industry || "");
  const [description, setDescription] = useState(company?.product_description || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { documents: fetchedDocs, uploadDocument, deleteDocument: deleteRemoteDoc } = useCompanyDocuments(company?.id);
  const { departments, addDept, isLoading: isLoadingDepts } = useDepartments(company?.id);

  const [newDeptName, setNewDeptName] = useState("");
  const [newDeptEmail, setNewDeptEmail] = useState("");
  const [newDeptDesc, setNewDeptDesc] = useState("");
  const [showAddDept, setShowAddDept] = useState(false);
  const [isAddingDept, setIsAddingDept] = useState(false);

  useEffect(() => {
    if (company) {
      setCompanyName(company.name);
      setIndustry(company.industry || "");
      setDescription(company.product_description || "");
    }
  }, [company, settingsOpen]);

  const handleSaveCompany = async () => {
    if (!company) return;
    setSaveError("");
    setIsSaving(true);

    try {
      const updated = await companyApi.updateCompany(company.id, {
        name: companyName,
        industry: industry || undefined,
        product_description: description || undefined,
      });
      setCompany(updated);
      setIsEditing(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setSaveError(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!company) return;
    setDeleteError("");

    try {
      await deleteRemoteDoc(docId);
      removeDocument(docId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setDeleteError(msg);
    }
  };

  const handleUploadMoreDocuments = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setUploadError("");
    setIsUploading(true);

    try {
      for (const file of e.target.files) {
        await uploadDocument(file);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      e.target.value = ""; // Reset input
    }
  };

  const handleLogout = () => {
    logout();
    closeSettings();
    router.push("/login");
  };

  // Overlay to close sidebar on click outside
  if (!settingsOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-30"
        onClick={closeSettings}
      />

      {/* Sidebar */}
      <div
        className="fixed left-0 top-0 h-full w-[380px] bg-[#FFFEF2] border-r-[4px] border-[#0A0A0A] shadow-[12px_0_0_#0A0A0A] z-40 overflow-y-auto flex flex-col"
        style={{
          transform: settingsOpen ? "translateX(0)" : "translateX(-100%)",
          transition: "transform 150ms cubic-bezier(0.2, 0, 0, 1)",
        }}
      >
        {/* Header */}
        <div className="bg-[#0A0A0A] text-[#FFFEF2] p-4 border-b-[3px] border-[#0A0A0A] flex justify-between items-center sticky top-0 z-50">
          <h2 className="font-display font-black text-xl uppercase tracking-tight">Settings</h2>
          <button
            onClick={closeSettings}
            className="text-2xl hover:scale-110 transition-transform"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 flex flex-col gap-8">
          {/* Company Section */}
          <div className="flex flex-col gap-3">
            <h3 className="font-label font-bold uppercase tracking-wider text-sm">Company</h3>

            {isEditing ? (
              <div className="flex flex-col gap-3">
                <Input
                  label="Name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <Input
                  label="Industry"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  placeholder="Optional"
                />
                <div className="flex flex-col gap-1">
                  <label className="font-label font-bold uppercase tracking-wider text-xs">
                    Description
                  </label>
                  <textarea
                    className="bg-white border-neo border-[2px] rounded-none px-2 py-1 font-mono text-xs outline-none shadow-[2px_2px_0px_#0A0A0A] focus:shadow-[3px_3px_0px_#0066FF] focus:border-[#0066FF] transition-all resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                {saveError && (
                  <div className="bg-[#FF4D4D] text-white border-[2px] border-[#0A0A0A] p-2 font-mono text-xs">
                    {saveError}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setSaveError("");
                    }}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveCompany}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="!p-3">
                <div className="flex flex-col gap-2 mb-3">
                  <p className="font-label font-bold uppercase tracking-wider text-xs text-[#3D3D3D]">
                    Name
                  </p>
                  <p className="font-mono text-sm">{company?.name}</p>
                </div>
                {industry && (
                  <div className="flex flex-col gap-2 mb-3">
                    <p className="font-label font-bold uppercase tracking-wider text-xs text-[#3D3D3D]">
                      Industry
                    </p>
                    <p className="font-mono text-sm">{industry}</p>
                  </div>
                )}
                {description && (
                  <div className="flex flex-col gap-2 mb-3">
                    <p className="font-label font-bold uppercase tracking-wider text-xs text-[#3D3D3D]">
                      Description
                    </p>
                    <p className="font-mono text-xs">{description}</p>
                  </div>
                )}
                <Button variant="secondary" size="sm" onClick={() => setIsEditing(true)} className="w-full">
                  Edit
                </Button>
              </Card>
            )}
          </div>

          {/* Documents Section */}
          <div className="flex flex-col gap-3">
            <h3 className="font-label font-bold uppercase tracking-wider text-sm">Documents ({fetchedDocs.length || documents.length})</h3>

            {deleteError && (
              <div className="bg-[#FF4D4D] text-white border-[2px] border-[#0A0A0A] p-2 font-mono text-xs">
                {deleteError}
              </div>
            )}

            {uploadError && (
              <div className="bg-[#FF4D4D] text-white border-[2px] border-[#0A0A0A] p-2 font-mono text-xs">
                {uploadError}
              </div>
            )}

            {(fetchedDocs.length || documents.length) === 0 ? (
              <p className="font-mono text-xs text-[#888]">No documents uploaded yet.</p>
            ) : (
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                {(fetchedDocs.length > 0 ? fetchedDocs : documents).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between bg-white border-[2px] border-[#0A0A0A] p-2 shadow-[2px_2px_0px_#0A0A0A]"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-xs font-bold truncate">{doc.filename}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="ml-2 text-sm text-[#FF4D4D] hover:scale-110 transition-transform"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload More */}
            <label className="flex flex-col items-center justify-center p-4 border-[2px] border-dashed border-[#0A0A0A] bg-[#F5F0E8] hover:bg-[#E8E4D4] cursor-pointer transition-colors">
              <span className="text-2xl mb-1">📄</span>
              <span className="font-mono text-xs font-bold text-center">
                {isUploading ? "Uploading..." : "Click to upload more"}
              </span>
              <input
                type="file"
                multiple
                accept=".pdf,.docx,.txt"
                onChange={handleUploadMoreDocuments}
                disabled={isUploading}
                className="hidden"
              />
            </label>
          </div>

          {/* Team Swarm Section */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center">
              <h3 className="font-label font-bold uppercase tracking-wider text-sm">Team Intelligence</h3>
              <button 
                onClick={() => setShowAddDept(!showAddDept)}
                className="w-6 h-6 bg-[#BFFF00] border-2 border-black flex items-center justify-center font-black shadow-[2px_2px_0px_#0A0A0A] hover:-translate-y-0.5 transition-all text-xs"
              >
                {showAddDept ? "✕" : "+"}
              </button>
            </div>

            {showAddDept && (
              <Card className="!p-3 border-dashed bg-white">
                <div className="flex flex-col gap-3">
                  <Input 
                    label="Department Name" 
                    placeholder="e.g. Legal, HR" 
                    value={newDeptName}
                    onChange={(e) => setNewDeptName(e.target.value)}
                  />
                  <Input 
                    label="Recipient Email" 
                    placeholder="e.g. name@company.com" 
                    value={newDeptEmail}
                    onChange={(e) => setNewDeptEmail(e.target.value)}
                  />
                  <Input 
                    label="Role Description" 
                    placeholder="e.g. Operations Manager" 
                    value={newDeptDesc}
                    onChange={(e) => setNewDeptDesc(e.target.value)}
                  />
                  <Button 
                    variant="primary" 
                    size="sm" 
                    disabled={isAddingDept || !newDeptName || !newDeptEmail}
                    onClick={async () => {
                      setIsAddingDept(true);
                      try {
                        await addDept({ 
                          name: newDeptName, 
                          contact_email: newDeptEmail, 
                          description: newDeptDesc,
                          contact_name: newDeptName 
                        });
                        setNewDeptName("");
                        setNewDeptEmail("");
                        setNewDeptDesc("");
                        setShowAddDept(false);
                      } finally {
                        setIsAddingDept(false);
                      }
                    }}
                  >
                    {isAddingDept ? "Adding..." : "Add to Team Swarm"}
                  </Button>
                </div>
              </Card>
            )}

            <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-1">
              {departments.map((dept, i) => (
                <div key={i} className="bg-white border-2 border-black p-2 shadow-[3px_3px_0px_#0A0A0A] flex flex-col gap-1">
                  <div className="flex justify-between items-start">
                    <span className="font-heading font-black text-[10px] uppercase tracking-tighter bg-black text-white px-1">
                      {dept.name}
                    </span>
                    <Badge variant="default" className="text-[8px] py-0">{dept.contact_name || 'Member'}</Badge>
                  </div>
                  <p className="font-mono text-[9px] text-[#555] truncate">{dept.contact_email}</p>
                </div>
              ))}
              {departments.length === 0 && !isLoadingDepts && (
                <p className="font-mono text-xs text-[#888] italic">No team members assigned.</p>
              )}
            </div>
          </div>

          {/* Account Section */}
          <div className="flex flex-col gap-3">
            <h3 className="font-label font-bold uppercase tracking-wider text-sm">Account</h3>
            <Card className="!p-3">
              <div className="flex flex-col gap-2">
                <p className="font-label font-bold uppercase tracking-wider text-xs text-[#3D3D3D]">
                  Email
                </p>
                <p className="font-mono text-sm">{user?.email || "—"}</p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLogout}
                  className="mt-3 w-full"
                >
                  Logout
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
