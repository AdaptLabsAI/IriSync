import * as React from 'react';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

export default function WorkflowHeroSection() {
  return (
    <>
      <div className="justify-center items-center flex flex-col text-center mb-10 py-15 px-4">
        <h2 className="text-2xl sm:text-3xl md:text-4xl">
          Simplify your workflow. Amplify your{' '}
          <span className="bg-gradient-to-r from-[#00C853] to-[#003305] bg-clip-text text-transparent">
            growth
          </span>
        </h2>
        <p className="text-sm text-gray-600 mt-3 max-w-xl">
          Manage less, achieve more - effortlessly grow your brand with smarter tools
        </p>
      </div>

      {/* Responsive Flex/Grid for Cards */}
      <div className="flex flex-col lg:flex-row justify-center items-center gap-8 px-4">
        <Card sx={{ maxWidth: 445, width: '100%' }}>
          <CardMedia
            sx={{ height: 340 }}
            image="/images/cardpic.png"
            title="green iguana"
          />
          <CardContent>
            <Typography gutterBottom variant="h7" component="div">
              Post, Create & Analyse - In a fraction of the time
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Schedule posts to go live anytime - even while you sleep or unwind at the beach.
              Quickly design content using Canva templates and let AI craft your captions and hashtags.
              Track performance with clear, actionable reports. Best of all? It’s all seamlessly managed in one single tab.
            </Typography>
          </CardContent>
          <CardActions></CardActions>
        </Card>

        <Card sx={{ maxWidth: 445, width: '100%' }}>
          <CardMedia
            sx={{ height: 340 }}
            image="/images/cardpic3.png"
            title="green iguana"
          />
          <CardContent>
            <Typography gutterBottom variant="h7" component="div">
              Smarter social growth with less work
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Identify your top-performing content and uncover what drives the most engagement and revenue.
              Benchmark your performance against competitors and receive personalized, data-backed recommendations to outperform your industry.
              With intelligent posting insights, you can stop juggling tabs.
            </Typography>
          </CardContent>
          <CardActions></CardActions>
        </Card>
      </div>
    </>
  );
}
