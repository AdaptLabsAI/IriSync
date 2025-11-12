'use client';

import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Stack
} from '@mui/material';
import Image from 'next/image';

type Post = {
  id: string;
  title: string;
  platform: string;
  likes: number;
  comments: number;
  shares: number;
  imageUrl: string;
};

type ContentPerformanceProps = {
  posts: Post[];
};

export default function ContentPerformance({ posts }: ContentPerformanceProps) {
  return (
    <Grid container spacing={2}>
      {posts.map(post => (
        <Grid item xs={12} sm={6} md={4} key={post.id}>
          <Card variant="outlined" sx={{ height: '100%' }}>
            <Box 
              sx={{ 
                position: 'relative',
                height: 140,
                backgroundColor: 'grey.100',
                backgroundImage: `url(${post.imageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  bgcolor: 'rgba(0,0,0,0.6)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: 12,
                }}
              >
                {post.platform}
              </Box>
            </Box>
            <CardContent>
              <Typography variant="subtitle2" sx={{ mb: 1, height: 40, overflow: 'hidden' }}>
                {post.title}
              </Typography>
              <Stack direction="row" spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Likes</Typography>
                  <Typography variant="body2" fontWeight="medium">{post.likes}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Comments</Typography>
                  <Typography variant="body2" fontWeight="medium">{post.comments}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Shares</Typography>
                  <Typography variant="body2" fontWeight="medium">{post.shares}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
} 