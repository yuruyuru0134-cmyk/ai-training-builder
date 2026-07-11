import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MaterialForm } from "./material-form";

export default function NewMaterialPage() {
  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>新規教材を作成</CardTitle>
          <CardDescription>
            テーマと所要時間を入力すると、AIが章構成案を生成します。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MaterialForm />
        </CardContent>
      </Card>
    </div>
  );
}
