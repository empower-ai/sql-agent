import { List, ListItem, ListItemButton, ListItemText } from '@mui/material';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';

interface Props {
  askQuestion: (question: string) => Promise<void>
}

const questions = [
  'What are the top 10 products by revenue?',
  'What are the top 10 products by revenue in the last 30 days?',
  'How many orders were placed in the last 30 days?',
  'How many users placed orders in the last 30 days?'
]

export const Instruction = (props: Props) => {
  const { askQuestion } = props;

  return (
      <Card sx={{ maxWidth: 600 }}>
        <CardContent>
          { /** ---- Instruction ---- */}
          <Typography gutterBottom variant="h5" component="div">
            Instruction
          </Typography>

          <Typography variant="body2" color="text.secondary" style={{ marginBottom: 36 }}>
            <p>
              This demo shows how you can use DSensei to ask questions about a dataset. A few example questions are listed below, but you can ask any <b>data question</b> you want.
            </p>
          </Typography>

          { /* ---- Dataset Info ---- */}
          <Typography gutterBottom variant="h5" component="div">
            Dataset Info
          </Typography>

          <Typography variant="body2" color="text.secondary" style={{ marginBottom: 36 }}>
            <p>
              This demo uses the <a href="https://console.cloud.google.com/marketplace/product/bigquery-public-data/thelook-ecommerce">theLook eCommerce</a> dataset, which contains 1.5 million rows of data from an online retailer.
            </p>
            <p>
              To inspect the schema of the dataset, you can click the "Show Schemas" button at the bottom left of the screen.
            </p>
          </Typography>

          { /* ---- Example Questions ---- */}
          <Typography gutterBottom variant="h5" component="div">
            Example Questions:
          </Typography>

          <Typography variant="body2" color="text.secondary" style={{ marginBottom: 12 }}>
            <p>
              You can click on any of the questions below to ask it to the model.
            </p>
          </Typography>

          <List>
            {
              questions.map((question, index) => {
                return (
                  <ListItem key={index} disablePadding>
                    <ListItemButton onClick={async () => { await askQuestion(question); }}>
                      <ListItemText primary={question} primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
          </List>

          </CardContent>
      </Card>
  )
}
