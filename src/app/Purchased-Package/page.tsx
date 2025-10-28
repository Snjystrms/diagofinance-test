"use client";

import { useState } from "react";
import { MainLayout } from "@/components/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Wallet, Package, Users, User, DollarSign } from "lucide-react";

export default function PurchasedPackagePage() {
  const [packageAmount, setPackageAmount] = useState("");
  const [recipient, setRecipient] = useState("myself");
  const [teammateUsername, setTeammateUsername] = useState("");
  const [transactionPassword, setTransactionPassword] = useState("");
  const [walletBalance] = useState(5000); // Mock wallet balance

  const handlePurchase = () => {
    const amount = parseFloat(packageAmount);
    if (amount < 1000 || amount > 30000) {
      alert("Package amount must be between $1,000 and $30,000");
      return;
    }

    if (recipient === "teammates" && !teammateUsername.trim()) {
      alert("Please enter teammate username");
      return;
    }

    if (!transactionPassword) {
      alert("Please enter transaction password");
      return;
    }

    // Handle purchase logic here
    console.log("Purchase initiated:", {
      amount,
      recipient,
      teammateUsername: recipient === "teammates" ? teammateUsername : null,
      transactionPassword
    });

    alert("Purchase successful!");
  };

  const isAmountValid = () => {
    const amount = parseFloat(packageAmount);
    return amount >= 1000 && amount <= 30000;
  };

  const canPurchase = () => {
    return (
      isAmountValid() &&
      transactionPassword &&
      (recipient === "myself" ||
        (recipient === "teammates" && teammateUsername.trim()))
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto p-6 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Purchased Package
          </h1>
          <p className="text-muted-foreground">
            Purchase investment packages and manage your portfolio
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Package Purchase
            </CardTitle>
            <CardDescription>
              Select your package amount and recipient to proceed with the
              purchase
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wallet Balance Display */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Wallet Balance</Label>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border">
                <Wallet className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">
                    ${walletBalance.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Available for purchase
                  </p>
                </div>
              </div>
            </div>

            {/* Package Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="packageAmount" className="text-sm font-medium">
                  Package Amount
                </Label>
                {packageAmount && !isAmountValid() && (
                  <p className="text-sm text-destructive">
                    Amount must be between $1,000 and $30,000
                  </p>
                )}
              </div>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="packageAmount"
                  type="number"
                  placeholder="Enter amount between $1,000 - $30,000"
                  value={packageAmount}
                  onChange={(e) => setPackageAmount(e.target.value)}
                  className="pl-10"
                  min="1000"
                  max="30000"
                />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Min: $1,000</span>
                <span className="text-muted-foreground">Max: $30,000</span>
              </div>
            </div>

            {/* Daily Reward Info */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Daily Allegiance Reward: 0.4% Daily (Mon to Fri)
                </span>
              </div>
            </div>

            {/* Recipient Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Recipient</Label>
              <RadioGroup value={recipient} onValueChange={setRecipient}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="myself" id="myself" />
                  <Label
                    htmlFor="myself"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    Myself
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="teammates" id="teammates" />
                  <Label
                    htmlFor="teammates"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Users className="h-4 w-4" />
                    Teammates
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Teammate Username Input */}
            {recipient === "teammates" && (
              <div className="space-y-2">
                <Label
                  htmlFor="teammateUsername"
                  className="text-sm font-medium"
                >
                  Teammate Username
                </Label>
                <Input
                  id="teammateUsername"
                  placeholder="Enter teammate username"
                  value={teammateUsername}
                  onChange={(e) => setTeammateUsername(e.target.value)}
                />
              </div>
            )}

            {/* Transaction Password */}
            <div className="space-y-2">
              <Label
                htmlFor="transactionPassword"
                className="text-sm font-medium"
              >
                Transaction Password
              </Label>
              <Input
                id="transactionPassword"
                type="password"
                placeholder="Enter your transaction password"
                value={transactionPassword}
                onChange={(e) => setTransactionPassword(e.target.value)}
              />
            </div>

            {/* Purchase Button */}
            <Button
              onClick={handlePurchase}
              disabled={!canPurchase()}
              className="w-full h-12 text-lg font-semibold"
              size="lg"
            >
              <Package className="h-5 w-5 mr-2" />
              BUY PACKAGE
            </Button>

            {/* Purchase Summary */}
            {packageAmount && isAmountValid() && (
              <div className="p-4 bg-muted rounded-lg border">
                <h4 className="font-medium mb-2">Purchase Summary</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Package Amount:</span>
                    <span className="font-medium">
                      ${parseFloat(packageAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recipient:</span>
                    <span className="font-medium capitalize">
                      {recipient === "myself"
                        ? "Myself"
                        : `Teammate: ${teammateUsername}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Daily Reward:</span>
                    <span className="font-medium text-green-600">0.4%</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
