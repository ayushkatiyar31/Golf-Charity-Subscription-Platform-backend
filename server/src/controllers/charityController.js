import { Charity } from '../models/Charity.js';
import { Donation } from '../models/Donation.js';
import { buildDefaultCharities } from '../data/defaultCharities.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { createError } from '../utils/createError.js';
import { slugify } from '../utils/slugify.js';

const ensureCharitiesExist = async () => {
  const defaults = buildDefaultCharities();

  for (const charity of defaults) {
    await Charity.findOneAndUpdate(
      { slug: charity.slug },
      charity,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
};

export const listCharities = asyncHandler(async (req, res) => {
  await ensureCharitiesExist();
  const { search = '', category = '' } = req.query;
  const query = {};

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { shortDescription: { $regex: search, $options: 'i' } },
      { tags: { $elemMatch: { $regex: search, $options: 'i' } } }
    ];
  }

  if (category) {
    query.category = category;
  }

  const charities = await Charity.find(query).sort({ featured: -1, createdAt: -1 });
  res.json(charities);
});

export const getFeaturedCharity = asyncHandler(async (_req, res) => {
  await ensureCharitiesExist();
  const featured = await Charity.findOne({ featured: true }).sort({ updatedAt: -1 });
  res.json(featured);
});

export const getCharityBySlug = asyncHandler(async (req, res) => {
  await ensureCharitiesExist();
  const charity = await Charity.findOne({ slug: req.params.slug });
  if (!charity) {
    throw createError(404, 'Charity not found');
  }

  const donations = await Donation.aggregate([
    { $match: { charity: charity._id } },
    {
      $group: {
        _id: '$charity',
        total: { $sum: '$amount' },
        count: { $sum: 1 }
      }
    }
  ]);

  res.json({
    charity,
    donations: donations[0] || { total: 0, count: 0 }
  });
});

export const createCharity = asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    slug: slugify(req.body.name)
  };

  const charity = await Charity.create(payload);
  res.status(201).json(charity);
});

export const updateCharity = asyncHandler(async (req, res) => {
  const charity = await Charity.findById(req.params.id);
  if (!charity) {
    throw createError(404, 'Charity not found');
  }

  Object.assign(charity, req.body);
  if (req.body.name) {
    charity.slug = slugify(req.body.name);
  }

  await charity.save();
  res.json(charity);
});

export const deleteCharity = asyncHandler(async (req, res) => {
  const charity = await Charity.findById(req.params.id);
  if (!charity) {
    throw createError(404, 'Charity not found');
  }

  await charity.deleteOne();
  res.json({ message: 'Charity removed' });
});
