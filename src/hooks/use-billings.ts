import { useLazyGetCheckoutQuery } from "@/redux/api/billing";
import { useAppSelector } from "@/redux/store";
import { toast } from "sonner";

export const useSubscriptionPlan = () => {
  const [trigger, { isFetching }] = useLazyGetCheckoutQuery();
  const { id } = useAppSelector((state) => state.profile);

  console.log(id);
  const onSubscribe = async () => {
    try {
      const res = await trigger(id).unwrap();

      // Validate response
      if (!res || !res.url) {
        console.error("Invalid checkout response:", res);
        toast.error("Invalid checkout response. Please try again.");
        return;
      }

      // hosted checkout
      window.location.href = res.url;
    } catch (err) {
      console.error("Checkout error:", err);

      // Extract error message
      let errorMessage = "Could not start checkout. Please try again.";

      if (err && typeof err === "object" && "data" in err) {
        const errorData = err.data as { error?: string; message?: string };
        if (errorData?.error) {
          errorMessage = errorData.error;
        } else if (errorData?.message) {
          errorMessage = errorData.message;
        }
      } else if (err instanceof Error && err.message) {
        errorMessage = err.message;
      }

      toast.error(errorMessage);
    }
  };

  return { onSubscribe, isFetching };
};
