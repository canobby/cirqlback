import CommunicationHub from "@/components/communication/communication-hub";

export default function CommunicationPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Communication Center</h1>
          <p className="text-gray-600 mt-2">
            Collaborate with partners, communicate with merchants, and coordinate campaigns
          </p>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border h-[calc(100vh-200px)]">
          <CommunicationHub context="testing" />
        </div>
      </div>
    </div>
  );
}