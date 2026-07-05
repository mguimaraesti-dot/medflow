"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { toast } from "sonner";
import { useCategories } from "./use-categories";
import { useCreateCategory } from "./use-create-category";
import { getCategoryIcon } from "@/shared/lib/lucide-icon-map";
import { ApiError } from "@/shared/lib/api-client";
import { EmptyState } from "@/shared/components/empty-state";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Skeleton } from "@/shared/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { CategoryType } from "../domain/category.entity";

const COLOR_PRESETS = [
  "#16A34A",
  "#0EA5E9",
  "#6366F1",
  "#DC2626",
  "#F59E0B",
  "#7C3AED",
  "#DB2777",
  "#64748B",
];

export function CategoriesScreen({ canCreate }: { canCreate: boolean }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("OUT");
  const [color, setColor] = useState(COLOR_PRESETS[0]);
  const { data: categories, isLoading } = useCategories();
  const createCategory = useCreateCategory();

  async function handleCreate() {
    try {
      await createCategory.mutateAsync({ name, type, color });
      setName("");
      setColor(COLOR_PRESETS[0]);
      toast.success("Categoria cadastrada.");
    } catch (error) {
      toast.error(
        error instanceof ApiError
          ? error.message
          : "Não foi possível cadastrar a categoria.",
      );
    }
  }

  return (
    <div className="space-y-6">
      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Nova categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
              <div className="space-y-2">
                <Label htmlFor="new-category-name">Nome</Label>
                <Input
                  id="new-category-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-category-type">Tipo</Label>
                <Select
                  value={type}
                  onValueChange={(value) => setType(value as CategoryType)}
                >
                  <SelectTrigger id="new-category-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Entrada</SelectItem>
                    <SelectItem value="OUT">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="button"
                disabled={!name.trim() || createCategory.isPending}
                onClick={handleCreate}
              >
                {createCategory.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-label={`Cor ${preset}`}
                    onClick={() => setColor(preset)}
                    className={
                      "h-7 w-7 rounded-full transition-shadow " +
                      (color === preset ? "ring-ring ring-2 ring-offset-2" : "")
                    }
                    style={{ backgroundColor: preset }}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Categorias</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          )}

          {!isLoading && categories && categories.length === 0 && (
            <EmptyState
              icon={Tags}
              title="Nenhuma categoria cadastrada."
              description="As categorias cadastradas aparecem aqui."
            />
          )}

          {!isLoading && categories && categories.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => {
                  const Icon = getCategoryIcon(category.icon);
                  return (
                    <TableRow key={category.id}>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <Icon
                            className="h-4 w-4"
                            style={{ color: category.color }}
                          />
                          {category.name}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            category.type === "IN" ? "default" : "secondary"
                          }
                        >
                          {category.type === "IN" ? "Entrada" : "Saída"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
