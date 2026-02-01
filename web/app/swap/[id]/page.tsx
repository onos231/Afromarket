import ChatBox from "../../components/ChatBox";

export default function SwapDealPage({ params }: { params: { id: string } }) {
  const dealId = params.id;

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold mb-4">Swap deal details</h1>
      {/* Existing deal details UI here */}

      {/* Negotiation Chat */}
      <ChatBox dealId={dealId} />
    </main>
  );
}
