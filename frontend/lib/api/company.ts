import { apiClient } from "./client";
import {
  CompanyCreate,
  CompanyUpdate,
  CompanyOut,
  DocumentOut,
  IngestResult,
  DepartmentContact,
} from "@/app/types/api";

export async function createCompany(data: CompanyCreate): Promise<CompanyOut> {
  return apiClient.post<CompanyOut>("/company", data);
}

export async function getCompany(id: string): Promise<CompanyOut> {
  return apiClient.get<CompanyOut>(`/company/${id}`);
}

export async function updateCompany(id: string, data: CompanyUpdate): Promise<CompanyOut> {
  return apiClient.patch<CompanyOut>(`/company/${id}`, data);
}

export async function listCompanies(): Promise<CompanyOut[]> {
  return apiClient.get<CompanyOut[]>("/company");
}

export async function listDocuments(companyId: string): Promise<DocumentOut[]> {
  return apiClient.get<DocumentOut[]>(`/company/${companyId}/documents`);
}

export async function deleteDocument(companyId: string, docId: string): Promise<void> {
  return apiClient.del<void>(`/company/${companyId}/documents/${docId}`);
}

export async function uploadDocument(
  companyId: string,
  file: File
): Promise<IngestResult> {
  const form = new FormData();
  form.append("company_id", companyId);
  form.append("file", file);
  return apiClient.post<IngestResult>("/compliance/documents/upload", form);
}

export async function listDepartments(companyId: string): Promise<DepartmentContact[]> {
  return apiClient.get<DepartmentContact[]>(`/departments/${companyId}`);
}

export async function addDepartment(data: DepartmentContact): Promise<DepartmentContact> {
  return apiClient.post<DepartmentContact>("/departments", data);
}
