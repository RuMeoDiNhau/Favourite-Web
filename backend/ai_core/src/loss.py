import torch

class ContrastiveLoss(torch.nn.Module):
    def __init__(self, margin=1.0):
        super().__init__()
        self.margin = margin

    def forward(self, output1, output2, label):
        distance = torch.nn.functional.pairwise_distance(output1, output2)
        loss = label * distance.pow(2) + (1 - label) * torch.clamp(self.margin - distance, min=0.0).pow(2)
        return loss.mean()
