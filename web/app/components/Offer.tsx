type OfferProps = {
  offerId: string;
};

export default function Offer({ offerId }: OfferProps) {
  const handleGenerateCode = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/offers/${offerId}/generate-code`, {
        method: "POST",
      });
      const data = await response.json();
      console.log("Generated code:", data);
      alert(`Confirmation code: ${data.confirmation_code}`);
    } catch (err) {
      console.error("Error generating code:", err);
    }
  };

  return (
    <button onClick={handleGenerateCode} className="px-4 py-2 bg-blue-600 text-white rounded">
      Generate Code
    </button>
  );
}
