export default function handler(req: any, res: any) {
  res.status(200).json({ status: "ok", service: "DermAl", timestamp: new Date().toISOString() });
}
