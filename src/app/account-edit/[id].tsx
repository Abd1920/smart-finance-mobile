import AccountForm from "@/components/AccountForm";
import { useLocalSearchParams } from "expo-router";

export default function EditAccountScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AccountForm id={id} />;
}
