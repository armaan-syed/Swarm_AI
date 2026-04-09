import { WorkflowProvider } from "@/app/context/WorkflowContext";
import Sidebar from "@/app/components/Sidebar";
import Topbar from "@/app/components/Topbar";
import Canvas from "@/app/components/Canvas";
import RightPanel from "@/app/components/RightPanel";

export default function Home() {
  return (
    <WorkflowProvider>
      <div className="flex h-screen bg-[#0b0b0e] text-white overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <Topbar />
          <Canvas />
        </div>
        <RightPanel />
      </div>
    </WorkflowProvider>
  );
}
