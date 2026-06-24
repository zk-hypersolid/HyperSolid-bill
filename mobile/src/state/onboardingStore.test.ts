import { useOnboardingStore } from "./onboardingStore";

describe("onboardingStore", () => {
  beforeEach(() => useOnboardingStore.setState({ welcomeSeen: false, startTab: "Markets" }));

  it("starts unseen, landing on Markets", () => {
    const s = useOnboardingStore.getState();
    expect(s.welcomeSeen).toBe(false);
    expect(s.startTab).toBe("Markets");
  });

  it("dismiss(Account) marks seen and lands on the Wallet tab", () => {
    useOnboardingStore.getState().dismiss("Account");
    expect(useOnboardingStore.getState().welcomeSeen).toBe(true);
    expect(useOnboardingStore.getState().startTab).toBe("Account");
  });

  it("dismiss(Markets) marks seen and lands on Markets", () => {
    useOnboardingStore.getState().dismiss("Markets");
    expect(useOnboardingStore.getState().welcomeSeen).toBe(true);
    expect(useOnboardingStore.getState().startTab).toBe("Markets");
  });
});
