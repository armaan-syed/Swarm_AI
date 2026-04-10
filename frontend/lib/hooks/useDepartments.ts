import { useState, useEffect, useCallback } from "react";
import { DepartmentContact } from "@/app/types/api";
import * as companyApi from "@/lib/api/company";

export function useDepartments(companyId?: string) {
  const [departments, setDepartments] = useState<DepartmentContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartments = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    try {
      const data = await companyApi.listDepartments(companyId);
      setDepartments(data);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
      // Fallback to team defaults if API fails (demo mode)
      setDepartments([
        { company_id: companyId, name: "Strategic Oversight", contact_name: "John Philji", contact_email: "johnphilji2007@gmail.com" },
        { company_id: companyId, name: "Operations", contact_name: "Chris Fernandes", contact_email: "chriscric17@gmail.com" },
        { company_id: companyId, name: "Risk & Audit", contact_name: "Armaan Syed", contact_email: "armaansyed009@gmail.com" },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const addDept = async (data: Omit<DepartmentContact, "company_id">) => {
    if (!companyId) return;
    try {
      const newDept = await companyApi.addDepartment({ ...data, company_id: companyId });
      setDepartments((prev) => [...prev, newDept]);
      return newDept;
    } catch (err) {
      setError("Failed to add department");
      throw err;
    }
  };

  return { departments, isLoading, error, addDept, refresh: fetchDepartments };
}
