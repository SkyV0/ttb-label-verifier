import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nProvider } from "@/components/I18nProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { UploadZone } from "@/components/UploadZone";

function wrap(ui: React.ReactNode) {
  return (
    <ThemeProvider>
      <I18nProvider>{ui}</I18nProvider>
    </ThemeProvider>
  );
}

describe("<UploadZone />", () => {
  it("renders the idle dropzone prompt when no file is selected", () => {
    render(wrap(<UploadZone file={null} onChange={() => {}} />));
    expect(screen.getByText(/Drop a label image here/i)).toBeInTheDocument();
  });

  it("shows file preview information after selection", () => {
    const file = new File(["x"], "stub.png", { type: "image/png" });
    render(wrap(<UploadZone file={file} onChange={() => {}} />));
    expect(screen.getByText("stub.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove/i })).toBeInTheDocument();
  });

  it("calls onChange(null) when the user clicks Remove", async () => {
    const user = userEvent.setup();
    const onChange = jest.fn();
    const file = new File(["x"], "stub.png", { type: "image/png" });
    render(wrap(<UploadZone file={file} onChange={onChange} />));
    await user.click(screen.getByRole("button", { name: /Remove/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("invokes onChange when a file is selected via the hidden input", () => {
    const onChange = jest.fn();
    const { container } = render(wrap(<UploadZone file={null} onChange={onChange} />));
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["x"], "label.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledWith(file);
  });
});
